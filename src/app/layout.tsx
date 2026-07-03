import type { Metadata } from "next";
import ChatWidget from "@/components/chat/ChatWidget";
import ConfigurationAlert from "@/components/ConfigurationAlert";
import GeminiWarningBanner from "@/components/GeminiWarningBanner";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Nagar AI - Civic Decision Intelligence Platform",
  description: "An AI-powered multi-agent civic intelligence dashboard and intake portal for smart communities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDatabaseMissing = !process.env.DATABASE_URL;
  const isGeminiMissing = !process.env.GEMINI_API_KEY;

  return (
    <html
      lang="en"
      className="h-full antialiased dark"
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-white font-sans">
        {isDatabaseMissing ? (
          <ConfigurationAlert 
            isDatabaseMissing={true} 
            isGeminiMissing={isGeminiMissing} 
          />
        ) : (
          <>
            {isGeminiMissing && <GeminiWarningBanner />}
            {children}
            {/* Floating Chat Widget across all pages */}
            <ChatWidget />
          </>
        )}
      </body>
    </html>
  );
}
