import { NextRequest, NextResponse } from "next/server";
import {
  buildSystemPrompt,
  extractIdentifiers,
  parseJudgmentTags,
} from "@/lib/system-prompt";
import { lookupPersons, saveJudgment, clearPartyRecords } from "@/lib/turso";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";

async function callNvidia(
  apiKey: string,
  messages: { role: string; content: string }[],
  opts?: { temperature?: number; max_tokens?: number }
) {
  const response = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b",
      messages,
      temperature: opts?.temperature ?? 0.25,
      max_tokens: opts?.max_tokens ?? 2800,
      top_p: 0.9,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    const msg =
      data.error?.message || data.message || data.detail || "NVIDIA API 請求失敗";
    throw Object.assign(new Error(msg), { status: response.status, data });
  }
  return (data.choices?.[0]?.message?.content || "").trim();
}

function extractLegalSection(content: string): string | null {
  const m = content.match(
    /【法律用語案情】\s*([\s\S]*?)(?=\n## |\n### 一、|\n### 1\.|\n一、|\n【|$)/
  );
  return m ? m[1].trim() : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, defendant, plaintiff, defendantId, plaintiffId, testMode } =
      body;
    const isTest = Boolean(testMode);

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "缺少 messages" }, { status: 400 });
    }

    const def = typeof defendant === "string" ? defendant.trim() : "";
    const pla = typeof plaintiff === "string" ? plaintiff.trim() : "";
    if (!def || !pla) {
      return NextResponse.json(
        { error: "開庭必須提供被告姓名（defendant）與提告人姓名（plaintiff）" },
        { status: 400 }
      );
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "未設定 NVIDIA_API_KEY。請在 Vercel 環境變數加入 NVIDIA_API_KEY=nvapi-...",
        },
        { status: 500 }
      );
    }

    const parties = {
      defendant: def,
      plaintiff: pla,
      defendantId:
        typeof defendantId === "string" && defendantId.trim()
          ? defendantId.trim()
          : undefined,
      plaintiffId:
        typeof plaintiffId === "string" && plaintiffId.trim()
          ? plaintiffId.trim()
          : undefined,
    };

    const lastUser =
      [...messages].reverse().find((m: { role: string }) => m.role === "user")
        ?.content || "";

    if (!lastUser.trim()) {
      return NextResponse.json({ error: "缺少使用者陳述" }, { status: 400 });
    }

    const recentText = [
      lastUser,
      parties.defendant,
      parties.plaintiff,
      parties.defendantId || "",
      parties.plaintiffId || "",
    ].join("\n");
    const { idNumbers, names } = extractIdentifiers(recentText);
    if (parties.defendantId) idNumbers.push(parties.defendantId);
    if (parties.plaintiffId) idNumbers.push(parties.plaintiffId);
    names.push(parties.defendant, parties.plaintiff);

    let persons: Awaited<ReturnType<typeof lookupPersons>>["persons"] = [];
    let cases: Awaited<ReturnType<typeof lookupPersons>>["cases"] = [];
    try {
      const found = await lookupPersons({
        idNumbers: [...new Set(idNumbers)],
        names: [...new Set(names)],
      });
      persons = found.persons;
      cases = found.cases;
    } catch (e) {
      console.error("Turso lookup error:", e);
    }

    const systemPrompt = await buildSystemPrompt({ persons, cases });
    const speedHint = `
## 輸出與速度要求（務必遵守）
1. 先用日常陳述轉寫成法律用語，放在最開頭區塊：
【法律用語案情】
（第三人稱、精簡法言法語，含被告／提告人稱謂）
2. 接著依固定結構輸出判決（使用 Markdown：##／###、**粗體**、列表）。
3. 條文引用精準即可，避免冗長重複；總篇幅控制精簡。
4. 罰鍰等金額一律使用 Bla$。
`;

    const partyBlock = `【本案當事人（已登錄，必須採納）】
被告：${parties.defendant}${parties.defendantId ? `，身分證字號 ${parties.defendantId}` : ""}
提告人：${parties.plaintiff}${parties.plaintiffId ? `，身分證字號 ${parties.plaintiffId}` : ""}

【使用者日常陳述】
${lastUser}

請先轉成【法律用語案情】，再依巴拉國法規完成判決（Markdown 格式）。`;

    const chatMessages = [
      { role: "system", content: systemPrompt + "\n" + speedHint },
      { role: "user", content: partyBlock },
    ];

    let content = "";
    try {
      content = await callNvidia(apiKey, chatMessages, {
        temperature: 0.25,
        max_tokens: 2800,
      });
    } catch (e) {
      console.error("LawSI error:", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "LawSI 審理失敗" },
        { status: 502 }
      );
    }

    const legalText = extractLegalSection(content) || "";
    const tags = parseJudgmentTags(content);
    let cleared = { deletedPersons: 0, deletedCases: 0 };

    if (isTest) {
      try {
        const clearIds = [
          parties.defendantId,
          parties.plaintiffId,
          tags.id_number || undefined,
        ].filter(Boolean) as string[];
        cleared = await clearPartyRecords({
          idNumbers: clearIds,
          names: [parties.defendant, parties.plaintiff],
        });
      } catch (e) {
        console.error("Turso clear (test mode) error:", e);
      }
    } else if (tags.case_summary || tags.punishments) {
      try {
        await saveJudgment({
          id_number:
            tags.id_number || parties.defendantId || idNumbers[0] || null,
          name: tags.name || parties.defendant || names[0] || null,
          case_summary:
            tags.case_summary || tags.event || content.slice(0, 200),
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

    if (isTest) {
      content =
        content +
        "\n\n---\n**【測試模式】** 本場審判未寫入資料庫，並已嘗試清除雙方既有紀錄。";
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
      legal_text: legalText,
      meta: {
        matched_persons: persons.length,
        matched_cases: cases.length,
        defendant: parties.defendant,
        plaintiff: parties.plaintiff,
        testMode: isTest,
        cleared,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "伺服器錯誤" },
      { status: 500 }
    );
  }
}
