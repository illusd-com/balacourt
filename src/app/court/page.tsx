"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function CourtPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "歡迎蒞臨巴拉國線上AI法廳。我是 LawSI。\n\n請陳述案情（含當事人姓名或身分證字號更佳）。我將完全依據巴拉國官方法規審理。\n\n※ 僅處理巴拉國法律相關事項。",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/court", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "請求失敗");
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
            完全依據巴拉國法規審理
          </p>
        </header>
        <div className="court-layout">
          <aside className="court-sidebar">
            <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "1rem" }}>使用提示</h3>
            <ul style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.7, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <li>• 清楚描述事件與當事人</li>
              <li>• 盡量提供姓名或身分證字號</li>
              <li>• 僅回答巴拉國法律問題</li>
              <li>• AI意見僅供參考</li>
            </ul>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "1.5rem" }}>LawSI · Ops-2.1</p>
          </aside>
          <div className="chat-container">
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-ai"}`}>
                  <div className="msg-role">{m.role === "user" ? "您" : "LawSI"}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {loading && (
                <div className="msg msg-ai">
                  <div className="msg-role">LawSI</div>
                  <div className="typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                placeholder="請陳述案情…（Enter 送出）"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
              />
              <button className="btn btn-primary" onClick={sendMessage} disabled={loading || !input.trim()}>
                {loading ? "…" : "送出"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
