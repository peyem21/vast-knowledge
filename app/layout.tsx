import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vast Knowledge — On-chain Alpha Radar",
  description:
    "Spot trending tokens and narratives before the crowd. Live on-chain screener for Solana and EVM chains.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Vast Knowledge", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-[#e6e8ee] antialiased">
        {children}
      </body>
    </html>
  );
}
