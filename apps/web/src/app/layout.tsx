import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { GoogleAnalytics } from "@/components/google-analytics";
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
    default: "Humaniser - Free AI Humanizer for Natural, Human-Like Writing",
    template: "%s | Humaniser"
  },
  description:
    "Humanize AI text from ChatGPT, Gemini, Claude, and other AI tools. Rewrite stiff drafts into natural, human-like writing with diff view, Light, Standard, and Deep modes.",
  applicationName: "Humaniser",
  keywords: [
    "AI writing humanizer",
    "AI humanizer",
    "humanize AI text",
    "free AI humanizer",
    "ChatGPT humanizer",
    "Gemini text humanizer",
    "Claude text humanizer",
    "AI detector naturalness score",
    "rewrite text naturally",
    "human-like writing",
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
    title: "Humaniser - Free AI Humanizer for Natural Writing",
    description: "Humanize AI text from ChatGPT, Gemini, and Claude with rewrite modes, diff view, and naturalness scoring.",
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
    title: "Humaniser - Free AI Humanizer",
    description: "Turn AI-assisted drafts into natural, human-like writing with Light, Standard, and Deep rewrite modes.",
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
          <GoogleAnalytics />
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
