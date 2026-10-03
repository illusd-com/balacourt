"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "首頁" },
  { href: "/court", label: "AI法廳" },
  { href: "/laws", label: "法規" },
  { href: "/about", label: "關於" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="site-header" id="header">
        <div className="container header-inner">
          <Link href="/" className="logo" aria-label="BalaCourt 首頁">
            <span className="logo-mark" aria-hidden="true" />
            <span className="logo-text">
              <span className="logo-zh">BalaCourt</span>
              <span className="logo-en">巴拉國線上AI法廳</span>
            </span>
          </Link>
          <nav className="nav" aria-label="主要導覽">
            <ul className="nav-list">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`nav-link ${pathname === item.href ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="header-actions">
            <button
              className="menu-toggle"
              type="button"
              aria-label="開啟選單"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>
      {open && (
        <div className="mobile-nav" id="mobile-nav">
          <nav aria-label="行動導覽">
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </>
  );
}
