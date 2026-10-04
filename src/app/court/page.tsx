"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourtIntakePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    defendant: "",
    plaintiff: "",
    defendantId: "",
    plaintiffId: "",
    previousUrl: "",
  });
  const [testMode, setTestMode] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleTestMode(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      const pwd = window.prompt("請輸入測試模式密碼");
      if (pwd === "922") {
        setTestMode(true);
      } else {
        e.target.checked = false;
        setTestMode(false);
        if (pwd !== null) window.alert("密碼錯誤，無法啟用測試模式。");
      }
    } else {
      setTestMode(false);
    }
  }

  async function startTrial(e: React.FormEvent) {
    e.preventDefault();
    const defendant = form.defendant.trim();
    const plaintiff = form.plaintiff.trim();
    if (!defendant || !plaintiff) {
      setFormError("開庭前必須填寫「被告姓名」與「提告人姓名」。");
      return;
    }
    setFormError("");
    setLoading(true);
    try {
      const res = await fetch("/api/hearing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defendant,
          plaintiff,
          defendantId: form.defendantId.trim() || undefined,
          plaintiffId: form.plaintiffId.trim() || undefined,
          testMode,
          previousUrl: form.previousUrl.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "無法建立開庭單");
      router.push(`/court/${data.id}`);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "建立開庭單失敗");
      setLoading(false);
    }
  }

  return (
    <section className="section" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
      <div className="container" style={{ maxWidth: "560px" }}>
        <header className="section-header" style={{ marginBottom: "1.5rem" }}>
          <h1 className="section-title">開庭登錄</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
            建立開庭單後進入 AI 法廳。審判結束後公開於「已完結審判」，並隱藏身分證字號。
          </p>
        </header>

        <form onSubmit={startTrial} className="card" style={{ padding: "1.5rem" }}>
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
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>被告身分證字號（選填，結束後公開時隱藏）</span>
              <input
                className="chat-input"
                style={{ minHeight: "auto", height: "42px" }}
                value={form.defendantId}
                onChange={(e) => setForm((f) => ({ ...f, defendantId: e.target.value }))}
                autoComplete="off"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>提告人身分證字號（選填，結束後公開時隱藏）</span>
              <input
                className="chat-input"
                style={{ minHeight: "auto", height: "42px" }}
                value={form.plaintiffId}
                onChange={(e) => setForm((f) => ({ ...f, plaintiffId: e.target.value }))}
                autoComplete="off"
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                引用前次開庭單（二次／三次審判，選填）
              </span>
              <input
                className="chat-input"
                style={{ minHeight: "auto", height: "42px" }}
                value={form.previousUrl}
                onChange={(e) => setForm((f) => ({ ...f, previousUrl: e.target.value }))}
                placeholder="貼上開庭單網址或 15 位 ID"
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
                （密碼 922）。結束後不公開寫入，並清除雙方資料庫紀錄。
              </span>
            </label>
          </div>

          {formError && (
            <p style={{ color: "#b91c1c", fontSize: "0.8125rem", marginTop: "0.75rem" }}>
              {formError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: "1.25rem" }}
            disabled={loading}
          >
            {loading ? "建立開庭單中…" : "確認並開庭"}
          </button>
        </form>
      </div>
    </section>
  );
}
