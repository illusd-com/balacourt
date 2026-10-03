import Link from "next/link";

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <p className="hero-eyebrow">巴拉國 · 公正至上</p>
          <h1 className="hero-title">
            線上AI法廳
            <br />
            <span className="hero-title-accent">LawSI · 智慧裁判</span>
          </h1>
          <p className="hero-desc">
            BalaCourt 是巴拉國官方線上AI法廳。由 LawSI 完全依據巴拉國官方法規審理。
          </p>
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/court" className="btn btn-primary">進入AI法廳</Link>
            <Link href="/laws" className="btn btn-ghost">查看法規</Link>
          </div>
        </div>
      </section>
      <section className="section" style={{ background: "var(--bg-subtle)" }}>
        <div className="container">
          <header className="section-header"><h2 className="section-title">核心服務</h2></header>
          <div className="feature-grid">
            <div className="card"><p className="card-label">即時諮詢</p><h3 className="card-title">LawSI</h3><p className="card-desc">依據巴拉國法規提供專業分析與判決。</p></div>
            <div className="card"><p className="card-label">完整判決</p><h3 className="card-title">懲罰與理由</h3><p className="card-desc">事件釐清、懲罰項目、為何被懲罰。</p></div>
            <div className="card"><p className="card-label">前案核對</p><h3 className="card-title">紀錄與狀態</h3><p className="card-desc">身分證字號／姓名查前案與懲罰狀態。</p></div>
          </div>
        </div>
      </section>
    </>
  );
}
