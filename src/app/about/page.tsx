export default function AboutPage() {
  return (
    <section className="section">
      <div className="container">
        <header className="section-header">
          <h1 className="section-title">關於 BalaCourt</h1>
        </header>
        <div style={{ maxWidth: "40em", color: "var(--text-secondary)", lineHeight: 1.75, fontSize: "1rem" }}>
          <p style={{ marginBottom: "1.25rem" }}>
            <strong style={{ color: "var(--text)" }}>BalaCourt</strong>（巴拉國線上AI法廳）由 AI 法官 LawSI（對外模型 Ops-2.1）透過 NVIDIA API 審理，完全依據巴拉國官方法規。案件過程、懲罰狀態與身分證字號等紀錄可存於 Turso。所有AI意見僅供參考，非正式法院判決。
          </p>
        </div>
      </div>
    </section>
  );
}
