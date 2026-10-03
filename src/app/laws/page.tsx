import { getLawsText, getPenaltiesText } from "@/lib/laws";
import Link from "next/link";

export default function LawsPage() {
  const laws = getLawsText();
  const penalties = getPenaltiesText();
  return (
    <section className="section">
      <div className="container">
        <header className="section-header">
          <h1 className="section-title">法規</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9375rem" }}>
            巴拉國官方法律與處罰對照全文
          </p>
        </header>
        <div className="card" style={{ marginBottom: "2rem" }}>
          <p className="card-label">罪刑法定</p>
          <p className="card-desc">行為之處罰以行為時之法律有明文規定者為限。巴拉國不設死刑，最重主刑為無期徒刑。</p>
        </div>
        <article className="card" style={{ marginBottom: "2rem", maxHeight: "70vh", overflow: "auto", whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.65, color: "var(--text-secondary)" }}>
          <h2 className="card-title" style={{ marginBottom: "1rem" }}>法律全文</h2>
          {laws || "（無法載入 laws.md）"}
        </article>
        <article className="card" style={{ maxHeight: "70vh", overflow: "auto", whiteSpace: "pre-wrap", fontSize: "0.875rem", lineHeight: 1.65, color: "var(--text-secondary)" }}>
          <h2 className="card-title" style={{ marginBottom: "1rem" }}>處罰內容全文</h2>
          {penalties || "（無法載入 penalties.md）"}
        </article>
        <div style={{ marginTop: "1.5rem" }}>
          <Link href="/court" className="btn btn-primary">進入AI法廳 LawSI</Link>
        </div>
      </div>
    </section>
  );
}
