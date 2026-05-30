import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Humaniser - Write like a human",
    template: "%s | Humaniser"
  },
  description:
    "Turn stiff drafts into clear, natural prose. Use Light, Standard, and Deep rewrite modes with diff view and naturalness scoring.",
  applicationName: "Humaniser",
  keywords: [
    "AI writing humanizer",
    "rewrite text naturally",
    "writing quality tool",
    "naturalness score",
    "AI text editor",
    "copywriting editor"
  ],
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Humaniser",
    title: "Humaniser - Write like a human",
    description: "Rewrite stiff drafts into clear, natural prose with diff view and naturalness scoring.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Humaniser writing editor preview"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Humaniser - Write like a human",
    description: "Rewrite stiff drafts into clear, natural prose with diff view and naturalness scoring.",
    images: ["/opengraph-image"]
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
        <body>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
