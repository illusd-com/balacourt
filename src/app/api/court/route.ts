import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  extractIdentifiers,
  parseJudgmentTags,
} from "@/lib/system-prompt";
import { lookupPersons, saveJudgment } from "@/lib/turso";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "缺少 messages" }, { status: 400 });
    }
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "未設定 NVIDIA_API_KEY。請在 Vercel 環境變數加入 NVIDIA_API_KEY" },
        { status: 500 }
      );
    }
    const recentText = messages
      .filter((m: { role: string }) => m.role === "user" || m.role === "assistant")
      .slice(-8)
      .map((m: { content: string }) => m.content)
      .join("\n");
    const { idNumbers, names } = extractIdentifiers(recentText);
    let persons: Awaited<ReturnType<typeof lookupPersons>>["persons"] = [];
    let cases: Awaited<ReturnType<typeof lookupPersons>>["cases"] = [];
    try {
      const found = await lookupPersons({ idNumbers, names });
      persons = found.persons;
      cases = found.cases;
    } catch (e) {
      console.error("Turso lookup error:", e);
    }
    const systemPrompt = buildSystemPrompt({ persons, cases });
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.filter((m: { role: string }) => m.role !== "system"),
    ];
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
          messages: chatMessages,
          temperature: 0.3,
          max_tokens: 4096,
          top_p: 0.9,
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      console.error("NVIDIA API error:", data);
      const msg = data.error?.message || data.message || data.detail || "NVIDIA API 請求失敗";
      return NextResponse.json({ error: msg }, { status: response.status });
    }
    let content = data.choices?.[0]?.message?.content || "";
    const tags = parseJudgmentTags(content);
    if (tags.case_summary || tags.punishments) {
      const lastUser =
        [...messages].reverse().find((m: { role: string }) => m.role === "user")?.content || "";
      try {
        await saveJudgment({
          id_number: tags.id_number || idNumbers[0] || null,
          name: tags.name || names[0] || null,
          case_summary: tags.case_summary || tags.event || content.slice(0, 200),
          event_clarification: tags.event,
          punishments: tags.punishments,
          reasons: tags.reasons,
          full_response: content,
          user_message: lastUser,
          current_status: tags.status || tags.punishments,
          follow_up: tags.follow_up,
        });
      } catch (e) {
        console.error("Turso save error:", e);
      }
    }
    content = content
      .replace(/\[CASE_SUMMARY\][\s\S]*?\[\/CASE_SUMMARY\]/gi, "")
      .replace(/\[ID_NUMBER\][\s\S]*?\[\/ID_NUMBER\]/gi, "")
      .replace(/\[NAME\][\s\S]*?\[\/NAME\]/gi, "")
      .replace(/\[PUNISHMENTS\][\s\S]*?\[\/PUNISHMENTS\]/gi, "")
      .replace(/\[REASONS\][\s\S]*?\[\/REASONS\]/gi, "")
      .replace(/\[EVENT\][\s\S]*?\[\/EVENT\]/gi, "")
      .replace(/\[STATUS\][\s\S]*?\[\/STATUS\]/gi, "")
      .replace(/\[FOLLOW_UP\][\s\S]*?\[\/FOLLOW_UP\]/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return NextResponse.json({
      content,
      meta: { matched_persons: persons.length, matched_cases: cases.length },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
