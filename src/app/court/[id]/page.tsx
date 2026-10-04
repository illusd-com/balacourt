"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { MarkdownBody } from "@/components/MarkdownBody";

type Message = { role: "user" | "assistant"; content: string };

type Slip = {
  id: string;
  status: "open" | "closed";
  defendant: string;
  plaintiff: string;
  summary_title: string | null;
  messages: Message[];
  legal_text: string | null;
  judgment: string | null;
  previous_slip_id: string | null;
  created_at: string;
  closed_at: string | null;
  test_mode: number;
};

export default function HearingRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [slip, setSlip] = useState<Slip | null>(null);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLegalText, setLastLegalText] = useState<string | null>(null);
  const [summaryTitle, setSummaryTitle] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!/^\d{15}$/.test(id)) {
      setError("無效的開庭單 ID（須為 15 位數字）");
      return;
    }
    fetch(`/api/hearing/${id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "載入失敗");
        setSlip(d);
        setMessages(d.messages || []);
        if (d.summary_title) setSummaryTitle(d.summary_title);
        if (d.legal_text) setLastLegalText(d.legal_text);
        if (!d.messages?.length && d.status === "open") {
          setMessages([
            {
              role: "assistant",
              content: `開庭單 **#${d.id}** 已建立。\n\n・被告：${d.defendant}\n・提告人：${d.plaintiff}${
                d.previous_slip_id
                  ? `\n・引用前次開庭單：[#${d.previous_slip_id}](/court/${d.previous_slip_id})`
                  : ""
              }\n\n請以日常用語陳述案情。審判結束後本開庭單將公開於「已完結審判」，身分證字號會自動隱藏。`,
            },
          ]);
        }
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, lastLegalText]);

  const readOnly = slip?.status === "closed";

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !slip || readOnly) return;

    const nextMessages = [...messages, { role: "user" as const, content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setLastLegalText(null);

    try {
      const res = await fetch("/api/court", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slipId: slip.id,
          previousSlipId: slip.previous_slip_id,
          defendant: slip.defendant,
          plaintiff: slip.plaintiff,
          testMode: Boolean(slip.test_mode),
          messages: nextMessages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "請求失敗");

      if (data.legal_text) setLastLegalText(data.legal_text);
      if (data.summary_title) setSummaryTitle(data.summary_title);

      const withAi = [
        ...nextMessages,
        { role: "assistant" as const, content: data.content || "無法取得回應" },
      ];
      setMessages(withAi);

      const r2 = await fetch(`/api/hearing/${id}`);
      if (r2.ok) {
        const d2 = await r2.json();
        setSlip(d2);
        if (d2.summary_title) setSummaryTitle(d2.summary_title);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "發生錯誤";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `系統提示：目前無法連線至AI服務（${msg}）。`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <p style={{ color: "#b91c1c" }}>{error}</p>
          <Link href="/court" className="btn btn-primary" style={{ marginTop: "1rem" }}>
            返回開庭登錄
          </Link>
        </div>
      </section>
    );
  }

  if (!slip) {
    return (
      <section className="section">
        <div className="container">
          <p style={{ color: "var(--text-secondary)" }}>載入開庭單…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <div className="container">
        <header className="section-header" style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
            開庭單 #{slip.id}
            {slip.status === "closed" ? " · 已完結（僅供閱覽）" : " · 審理中"}
          </p>
          <h1 className="section-title">
            {summaryTitle || slip.summary_title || "AI法廳 · LawSI"}
          </h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
            被告：{slip.defendant} ／ 提告人：{slip.plaintiff}
            {slip.previous_slip_id && (
              <>
                {" "}／ 前次：
                <Link href={`/court/${slip.previous_slip_id}`}>#{slip.previous_slip_id}</Link>
              </>
            )}
          </p>
        </header>

        <div className="court-layout">
          <aside className="court-sidebar">
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
              開庭單資訊
            </h3>
            <ul
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <li>ID：{slip.id}</li>
              <li>狀態：{slip.status === "closed" ? "已完結公開" : "審理中"}</li>
              <li>建立：{new Date(slip.created_at).toLocaleString("zh-TW")}</li>
              {slip.closed_at && (
                <li>完結：{new Date(slip.closed_at).toLocaleString("zh-TW")}</li>
              )}
            </ul>
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <Link href="/completed" className="btn btn-ghost" style={{ fontSize: "0.8125rem" }}>
                已完結審判
              </Link>
              <Link href="/court" className="btn btn-ghost" style={{ fontSize: "0.8125rem" }}>
                新開庭
              </Link>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
              LawSI · Ops-2.1
            </p>
          </aside>

          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-ai"}`}>
                  <div className="msg-role">{m.role === "user" ? "您" : "LawSI"}</div>
                  {m.role === "assistant" ? (
                    <MarkdownBody content={m.content} />
                  ) : (
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  )}
                </div>
              ))}
              {lastLegalText && !readOnly && (
                <div
                  className="msg msg-ai"
                  style={{ borderStyle: "dashed", background: "var(--bg)", fontSize: "0.8125rem" }}
                >
                  <div className="msg-role">系統 · 法律用語轉換</div>
                  <MarkdownBody content={lastLegalText} />
                </div>
              )}
              {loading && (
                <div className="msg msg-ai">
                  <div className="msg-role">處理中</div>
                  <div className="typing">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    LawSI 審理中…
                  </p>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {readOnly ? (
              <div
                className="chat-input-area"
                style={{ justifyContent: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}
              >
                本開庭單已完結，僅供閱覽。可至「已完結審判」搜尋，或引用本 ID 進行二次審判。
              </div>
            ) : (
              <div className="chat-input-area">
                <textarea
                  className="chat-input"
                  placeholder="請以日常用語陳述案情…（Enter 送出）"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  disabled={loading}
                />
                <button
                  className="btn btn-primary"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                >
                  {loading ? "…" : "送出"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
