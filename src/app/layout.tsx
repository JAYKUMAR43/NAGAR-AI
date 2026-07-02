import type { Metadata } from "next";
import ChatWidget from "@/components/chat/ChatWidget";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nagar AI - Civic Decision Intelligence Platform",
  description: "An AI-powered multi-agent civic intelligence dashboard and intake portal for smart communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-white font-sans">
        {children}
        {/* Floating Chat Widget across all pages */}
        <ChatWidget />
      </body>
    </html>
  );
}
