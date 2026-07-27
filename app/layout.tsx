import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTest.ge — ონლაინ სასკოლო ტესტები",
  description: "სრული ონლაინ სატესტო პლატფორმა საქართველოს სკოლებისთვის.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" style={{ width: "100%", height: "100%" }}>
      <body style={{ margin: 0, width: "100%", height: "100%", overflow: "hidden", background: "#f0f4f8" }}>
        {children}
      </body>
    </html>
  );
}
