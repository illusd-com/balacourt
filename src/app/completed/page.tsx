"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Item = {
  id: string;
  summary_title: string | null;
  defendant: string;
  plaintiff: string;
  closed_at: string | null;
  created_at: string;
  previous_slip_id: string | null;
};

export default function CompletedPage() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(query?: string) {
    setLoading(true);
    setError("");
    try {
      const url = query
        ? `/api/hearing?q=${encodeURIComponent(query)}`
        : "/api/hearing";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "載入失敗");
      setItems(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    load(q.trim());
  }

  return (
    <section className="section" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <div className="container">
        <header className="section-header" style={{ marginBottom: "1.5rem" }}>
          <h1 className="section-title">已完結審判</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
            公開閱覽已完結開庭單。身分證字號已隱藏。可依開庭單 ID 或總結名稱搜尋。
          </p>
        </header>

        <form
          onSubmit={onSearch}
          style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}
        >
          <input
            className="chat-input"
            style={{ flex: 1, minWidth: "200px", minHeight: "auto", height: "42px" }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋開庭單 ID 或總結名稱…"
          />
          <button type="submit" className="btn btn-primary">
            搜尋
          </button>
          <Link href="/court" className="btn btn-ghost">
            新開庭
          </Link>
        </form>

        {error && <p style={{ color: "#b91c1c", marginBottom: "1rem" }}>{error}</p>}
        {loading && <p style={{ color: "var(--text-secondary)" }}>載入中…</p>}

        {!loading && items.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>尚無已完結審判，或查無符合結果。</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/court/${item.id}`}
              className="card"
              style={{
                display: "block",
                padding: "1.1rem 1.25rem",
                transition: "border-color 0.2s",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.35rem",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                #{item.id}
                {item.previous_slip_id && ` · 引用 #${item.previous_slip_id}`}
              </div>
              <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "0.35rem" }}>
                {item.summary_title || "（未命名審判）"}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
                被告：{item.defendant} ／ 提告人：{item.plaintiff}
                {item.closed_at && (
                  <> · {new Date(item.closed_at).toLocaleString("zh-TW")}</>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
