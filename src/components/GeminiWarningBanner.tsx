"use client";

import { useState } from "react";
import { AlertTriangle, X, Key, Server, RefreshCw, ExternalLink, Sparkles } from "lucide-react";

export default function GeminiWarningBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("GEMINI_API_KEY");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Top Banner Bar */}
      <div className="bg-gradient-to-r from-amber-950/90 via-yellow-950/80 to-amber-950/90 backdrop-blur-md border-b border-amber-500/20 text-amber-200 py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-3 relative z-40 shadow-lg shadow-amber-950/10">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 animate-pulse flex-shrink-0" />
        <span className="text-center">
          Running in <strong className="text-white">Demo Mode</strong> (Local heuristics active). 
          Configure live Gemini API for smart multi-agent routing.
        </span>
        <button
          onClick={() => setIsOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold px-3 py-1 rounded-lg transition-colors flex items-center gap-1 cursor-pointer select-none"
        >
          Configure AI
        </button>
      </div>

      {/* Interactive Modal Guide */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Box */}
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl relative z-10 flex flex-col gap-5 overflow-hidden animate-in fade-in zoom-in-95 duration-205">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Enable Gemini Live AI</h3>
                  <p className="text-[10px] text-gray-400">Exit Demo Mode & unlock full neural routing models.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs leading-relaxed text-gray-300">
              <p>
                To enable live AI-powered classification, automated routing, and conversational RAG synthesis, you need to acquire a Google Gemini API Key and register it in your environment:
              </p>

              <div className="bg-gray-950 border border-gray-900 rounded-2xl p-4 space-y-3 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wide">Environment Key</span>
                  <button 
                    onClick={handleCopy}
                    className="text-[10px] font-mono text-gray-500 hover:text-white transition-colors"
                  >
                    {copied ? "Copied!" : "Copy Key"}
                  </button>
                </div>
                <code className="text-white font-mono block select-all p-2 rounded bg-gray-900 border border-gray-850">GEMINI_API_KEY</code>
                
                <div className="flex items-center gap-1.5 pt-1 text-[10px] text-gray-400">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Get a free key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink className="w-2.5 h-2.5" /></a></span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-white flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-indigo-400" /> 
                  Applying to Vercel Deployments
                </h4>
                <ol className="list-decimal pl-4 space-y-1 text-gray-400 text-[11px]">
                  <li>Navigate to your project dashboard on Vercel.</li>
                  <li>Go to <strong>Settings</strong> &rarr; <strong>Environment Variables</strong>.</li>
                  <li>Add <code>GEMINI_API_KEY</code> with your live key as the value.</li>
                  <li>Redeploy your project from the <strong>Deployments</strong> tab for changes to take effect.</li>
                </ol>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-850">
              <button 
                onClick={() => setIsOpen(false)}
                className="bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl border border-gray-700 transition-all cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
