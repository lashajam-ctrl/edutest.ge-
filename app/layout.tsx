import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://edutest.ge"),
  title: "EduTest.ge — სკოლის ონლაინ ტესტები I–XII კლასისთვის",
  description: "კლასზე მორგებული სასკოლო ტესტები, გასაგები ახსნა და რეალური პროგრესის ანალიზი საქართველოს სკოლებისთვის.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    locale: "ka_GE",
    url: "/",
    siteName: "EduTest.ge",
    title: "EduTest.ge — ისწავლე თამაშით. გაიზარდე ცოდნით.",
    description: "კლასზე მორგებული ტესტები, გასაგები ახსნა და პროგრესის შემდეგი ნაბიჯი.",
    images: [{ url: "/og-v2.png", width: 1732, height: 908, alt: "EduTest.ge — ისწავლე თამაშით. გაიზარდე ცოდნით." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "EduTest.ge — ისწავლე თამაშით. გაიზარდე ცოდნით.",
    description: "კლასზე მორგებული ტესტები, გასაგები ახსნა და პროგრესის შემდეგი ნაბიჯი.",
    images: ["/og-v2.png"],
  },
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
