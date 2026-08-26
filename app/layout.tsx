import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://edutest.ge"),
  title: "EduTest.ge — სკოლის ონლაინ ტესტები I–XII კლასისთვის",
  description: "კლასზე მორგებული სასკოლო ტესტები, გასაგები ახსნა და რეალური პროგრესის ანალიზი საქართველოს სკოლებისთვის.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48.png", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      { url: "/favicon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
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

const organizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://edutest.ge/#organization",
  name: "EduTest.ge",
  url: "https://edutest.ge/",
  logo: {
    "@type": "ImageObject",
    url: "https://edutest.ge/meta-app-icon-1024.png",
    contentUrl: "https://edutest.ge/meta-app-icon-1024.png",
    width: 1024,
    height: 1024,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ka" style={{ width: "100%", height: "100%" }}>
      <head>
        <script type="application/ld+json">{JSON.stringify(organizationStructuredData)}</script>
      </head>
      <body style={{ margin: 0, width: "100%", height: "100%", overflow: "hidden", background: "#f0f4f8" }}>
        {children}
      </body>
    </html>
  );
}
