import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synapse — Next-gen Video Chat",
  description:
    "Connect with like-minded people. Video chat with smart interest-based matching.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/icons/icon-192x192.png",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://synapse.app"
  ),
  openGraph: {
    title: "Synapse — Next-gen Video Chat",
    description:
      "Connect with like-minded people. Video chat with smart interest-based matching.",
    siteName: "Synapse",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Synapse — Next-gen Video Chat",
    description:
      "Connect with like-minded people. Video chat with smart interest-based matching.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("synapse-theme");if(!t)return;var m={"default":"#030712","aurora":"#0a1628","ember":"#1a0a0a","forest":"#071209","sakura":"#1a0a1a","ocean":"#020c1b","sandstorm":"#1a1408"};var a={"default":"#6366f1","aurora":"#22d3ee","ember":"#f97316","forest":"#22c55e","sakura":"#e879f9","ocean":"#3b82f6","sandstorm":"#eab308"};if(m[t]){document.documentElement.style.setProperty("--background",m[t]);document.documentElement.style.setProperty("--accent",a[t])}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white`}
        style={{ background: "var(--background)" }}
      >
        {children}
      </body>
    </html>
  );
}
