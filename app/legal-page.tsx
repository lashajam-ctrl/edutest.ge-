import type { ReactNode } from "react";
import Link from "next/link";

export function LegalPage({ title, version, children }: { title: string; version: string; children: ReactNode }) {
  return (
    <main style={{ position: "fixed", inset: 0, overflowY: "auto", background: "#fff8f3", color: "#272334", fontFamily: "'Noto Sans Georgian', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 20px 64px" }}>
        <Link href="/" style={{ display: "inline-flex", minHeight: 44, alignItems: "center", color: "#7a3f59", fontWeight: 700, textDecoration: "none" }}>← EduTest.ge-ზე დაბრუნება</Link>
        <article style={{ marginTop: 18, padding: "clamp(22px, 5vw, 44px)", border: "1px solid #ecd8cf", borderRadius: 24, background: "#fff", boxShadow: "0 18px 50px rgba(86, 52, 66, .08)", lineHeight: 1.75 }}>
          <p style={{ margin: 0, color: "#a15067", fontSize: 13, fontWeight: 700 }}>EduTest.ge · ვერსია {version}</p>
          <h1 style={{ margin: "8px 0 24px", color: "#472838", fontSize: "clamp(26px, 5vw, 40px)", lineHeight: 1.2 }}>{title}</h1>
          <div className="legal-copy">{children}</div>
        </article>
      </div>
    </main>
  );
}
