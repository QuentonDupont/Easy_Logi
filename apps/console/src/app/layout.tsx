import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Easy Logi Console",
  description: "Auto-parts sourcing and logistics console for Eswatini and South Africa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
