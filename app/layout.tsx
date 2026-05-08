import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Web Image",
  description: "OpenAI 兼容生图 Web UI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
