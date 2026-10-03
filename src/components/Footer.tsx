import Link from "next/link";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="logo-mark" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <div>
            <strong>BalaCourt</strong>
            <span>巴拉國線上AI法廳</span>
          </div>
        </div>
        <div className="footer-links">
          <Link href="/">首頁</Link>
          <Link href="/court">AI法廳</Link>
          <Link href="/laws">法規</Link>
          <Link href="/about">關於</Link>
        </div>
        <p className="footer-copy">© 2026 巴拉國政府 · BalaCourt. 公正透明，服務人民。</p>
      </div>
    </footer>
  );
}
