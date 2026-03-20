import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🎓 學位通</span>
          <p className="text-muted">幫助家長快速搵到有學位嘅學校</p>
        </div>
        <div className="footer-links">
          <Link href="/schools?stage=kg">幼稚園</Link>
          <Link href="/favorites">我的收藏</Link>
          <Link href="/compare">學校對比</Link>
        </div>
        <div className="footer-copy text-muted">
          © 2026 HKSchoolPlace · MVP 版本 · 數據每日更新
        </div>
      </div>
    </footer>
  );
}
