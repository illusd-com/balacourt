"use client";

import { useState, useRef, useEffect } from "react";
import { MarkdownBody } from "@/components/MarkdownBody";

type Message = { role: "user" | "assistant"; content: string };

type Parties = {
  defendant: string;
  plaintiff: string;
  defendantId?: string;
  plaintiffId?: string;
};

export default function CourtPage() {
  const [parties, setParties] = useState<Parties | null>(null);
  const [form, setForm] = useState({
    defendant: "",
    plaintiff: "",
    defendantId: "",
    plaintiffId: "",
  });
  const [formError, setFormError] = useState("");
  const [testMode, setTestMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastLegalText, setLastLegalText] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, lastLegalText]);

  function startTrial(e: React.FormEvent) {
    e.preventDefault();
    const defendant = form.defendant.trim();
    const plaintiff = form.plaintiff.trim();
    if (!defendant || !plaintiff) {
      setFormError("開庭前必須填寫「被告姓名」與「提告人姓名」。");
      return;
    }
    setFormError("");
    const p: Parties = {
      defendant,
      plaintiff,
      defendantId: form.defendantId.trim() || undefined,
      plaintiffId: form.plaintiffId.trim() || undefined,
    };
    setParties(p);
    setMessages([
      {
        role: "assistant",
        content: `開庭資料已登錄。\n\n・被告：${p.defendant}${p.defendantId ? `（證號 ${p.defendantId}）` : ""}\n・提告人：${p.plaintiff}${p.plaintiffId ? `（證號 ${p.plaintiffId}）` : ""}\n\n請以日常用語陳述案情。LawSI 會轉成法律用語並依巴拉國法規審理（Markdown 呈現）。\n\n※ 僅處理巴拉國法律相關事項。${testMode ? "\n\n**【測試模式】** 本場結束後不寫入且會清除雙方紀錄。" : ""}`,
      },
    ]);
  }

  function toggleTestMode(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      const pwd = window.prompt("請輸入測試模式密碼");
      if (pwd === "922") {
        setTestMode(true);
      } else {
        e.target.checked = false;
        setTestMode(false);
        if (pwd !== null) {
          window.alert("密碼錯誤，無法啟用測試模式。");
        }
      }
    } else {
      setTestMode(false);
    }
  }

  function resetTrial() {
    setParties(null);
    setMessages([]);
    setInput("");
    setLastLegalText(null);
    setFormError("");
    setTestMode(false);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading || !parties) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setLastLegalText(null);

    try {
      const res = await fetch("/api/court", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defendant: parties.defendant,
          plaintiff: parties.plaintiff,
          defendantId: parties.defendantId,
          plaintiffId: parties.plaintiffId,
          testMode,
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "請求失敗");

      if (data.legal_text) {
        setLastLegalText(data.legal_text);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.content || "無法取得回應" },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "發生錯誤";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `系統提示：目前無法連線至AI服務（${msg}）。\n\n請確認 Vercel 已設定 NVIDIA_API_KEY。`,
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

  return (
    <section className="section" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <div className="container">
        <header className="section-header" style={{ marginBottom: "1.5rem" }}>
          <h1 className="section-title">AI法廳 · LawSI</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
            開庭須先登錄被告與提告人；判決以 Markdown 呈現
          </p>
        </header>

        <div className="court-layout">
          <aside className="court-sidebar">
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>
              開庭程序
            </h3>
            <ul
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <li>1. 必填被告、提告人姓名</li>
              <li>2. 以日常用語陳述案情</li>
              <li>3. LawSI 轉法律用語並審理</li>
              <li>4. 判決以 Markdown 呈現</li>
            </ul>
            {parties && (
              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: "1px solid var(--border)",
                  fontSize: "0.8125rem",
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                }}
              >
                <p style={{ fontWeight: 600, color: "var(--text)", marginBottom: "0.35rem" }}>
                  本次當事人
                </p>
                <p>被告：{parties.defendant}</p>
                <p>提告人：{parties.plaintiff}</p>
                {testMode && (
                  <p style={{ color: "#b91c1c", fontWeight: 600, marginTop: "0.5rem" }}>
                    測試模式已啟用（結束不留存／清除紀錄）
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetTrial}
                  style={{ marginTop: "0.75rem", fontSize: "0.75rem", padding: "0.35rem 0.75rem" }}
                >
                  重新開庭
                </button>
              </div>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>
              LawSI · Ops-2.1
            </p>
          </aside>

          <div className="chat-container">
            {!parties ? (
              <form onSubmit={startTrial} style={{ padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.0625rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  開庭登錄（必填）
                </h2>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--text-secondary)",
                    marginBottom: "1.25rem",
                    lineHeight: 1.6,
                  }}
                >
                  每次開始審判前，必須先輸入被告姓名與提告人姓名，始得進入陳述與審理。
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      被告姓名 <span style={{ color: "#b91c1c" }}>*</span>
                    </span>
                    <input
                      className="chat-input"
                      style={{ minHeight: "auto", height: "42px" }}
                      value={form.defendant}
                      onChange={(e) => setForm((f) => ({ ...f, defendant: e.target.value }))}
                      placeholder="例：王小明"
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      提告人姓名 <span style={{ color: "#b91c1c" }}>*</span>
                    </span>
                    <input
                      className="chat-input"
                      style={{ minHeight: "auto", height: "42px" }}
                      value={form.plaintiff}
                      onChange={(e) => setForm((f) => ({ ...f, plaintiff: e.target.value }))}
                      placeholder="例：陳大文"
                      required
                      autoComplete="off"
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      被告身分證字號（選填）
                    </span>
                    <input
                      className="chat-input"
                      style={{ minHeight: "auto", height: "42px" }}
                      value={form.defendantId}
                      onChange={(e) => setForm((f) => ({ ...f, defendantId: e.target.value }))}
                      placeholder="選填，利於前案核對"
                      autoComplete="off"
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      提告人身分證字號（選填）
                    </span>
                    <input
                      className="chat-input"
                      style={{ minHeight: "auto", height: "42px" }}
                      value={form.plaintiffId}
                      onChange={(e) => setForm((f) => ({ ...f, plaintiffId: e.target.value }))}
                      placeholder="選填"
                      autoComplete="off"
                    />
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.5rem",
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      lineHeight: 1.5,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={toggleTestMode}
                      style={{ marginTop: "0.2rem" }}
                    />
                    <span>
                      <strong style={{ color: "var(--text)" }}>測試模式</strong>
                      （需密碼）。勾選後本場審判結束時<strong>不寫入</strong>且會
                      <strong>清除</strong>雙方在資料庫的紀錄。
                    </span>
                  </label>
                </div>

                {formError && (
                  <p style={{ color: "#b91c1c", fontSize: "0.8125rem", marginTop: "0.75rem" }}>
                    {formError}
                  </p>
                )}

                <button type="submit" className="btn btn-primary" style={{ marginTop: "1.25rem" }}>
                  確認並開庭
                </button>
              </form>
            ) : (
              <>
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
                  {lastLegalText && (
                    <div
                      className="msg msg-ai"
                      style={{
                        borderStyle: "dashed",
                        background: "var(--bg)",
                        fontSize: "0.8125rem",
                      }}
                    >
                      <div className="msg-role">系統 · 法律用語轉換</div>
                      <div style={{ color: "var(--text-secondary)" }}>
                        <MarkdownBody content={lastLegalText} />
                      </div>
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
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
