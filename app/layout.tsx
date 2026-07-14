import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduTest.ge — ონლაინ სასკოლო ტესტები",
  description: "სრული ონლაინ სატესტო პლატფორმა საქართველოს სკოლებისთვის.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ka"><body>{children}</body></html>;
}
