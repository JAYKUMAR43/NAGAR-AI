"use client";

import { useState } from "react";
import { 
  Database, Key, RefreshCw, AlertTriangle, CheckCircle2, 
  Server, Code2, Sparkles, Terminal, ArrowRight, ExternalLink, HelpCircle
} from "lucide-react";

export default function ConfigurationAlert({
  isDatabaseMissing = true,
  isGeminiMissing = false
}: {
  isDatabaseMissing?: boolean;
  isGeminiMissing?: boolean;
}) {
  const [activeStep, setActiveStep] = useState<number>(1);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const steps = [
    {
      id: 1,
      title: "Provision Database",
      icon: Server,
      color: "text-cyan-400 border-cyan-500/25 bg-cyan-950/20",
      description: "Create a hosted PostgreSQL database.",
      details: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            Nagar AI requires a persistent database to store complaints, action logs, and official accounts. Local SQLite files do not persist in serverless environments like Vercel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a 
              href="https://vercel.com/storage/postgres" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col p-3 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/80 hover:border-cyan-500/30 transition-all text-left"
            >
              <span className="font-bold text-xs text-white flex items-center gap-1">Vercel Postgres <ExternalLink className="w-3 h-3" /></span>
              <span className="text-[10px] text-gray-500 mt-1">Integrated storage with one-click setup.</span>
            </a>
            <a 
              href="https://neon.tech" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col p-3 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/80 hover:border-cyan-500/30 transition-all text-left"
            >
              <span className="font-bold text-xs text-white flex items-center gap-1">Neon <ExternalLink className="w-3 h-3" /></span>
              <span className="text-[10px] text-gray-500 mt-1">Serverless Postgres with instant branching.</span>
            </a>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col p-3 rounded-xl border border-gray-800 bg-gray-900/40 hover:bg-gray-900/80 hover:border-cyan-500/30 transition-all text-left"
            >
              <span className="font-bold text-xs text-white flex items-center gap-1">Supabase <ExternalLink className="w-3 h-3" /></span>
              <span className="text-[10px] text-gray-500 mt-1">Backend-as-a-service with hosted Postgres.</span>
            </a>
          </div>
          <p className="text-xs text-amber-300 bg-amber-950/20 border border-amber-500/25 p-3 rounded-lg flex gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Make sure to copy the connection URI starting with <code>postgresql://</code> or <code>postgres://</code>.</span>
          </p>
        </div>
      )
    },
    {
      id: 2,
      title: "Configure Environment",
      icon: Code2,
      color: "text-indigo-400 border-indigo-500/25 bg-indigo-950/20",
      description: "Inject credentials into your deployment dashboard.",
      details: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            Add these environment variables to your deployment environment. For Vercel, navigate to <strong>Project Settings → Environment Variables</strong>. Do NOT write them directly in code or commit them.
          </p>
          <div className="space-y-3">
            <div className="bg-gray-950 border border-gray-900 rounded-xl p-3.5 relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Database Connection String</span>
                <button 
                  onClick={() => handleCopy("DATABASE_URL", "db_url")}
                  className="text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
                >
                  {copiedText === "db_url" ? "Copied!" : "Copy Key"}
                </button>
              </div>
              <code className="text-xs text-white font-mono block select-all">DATABASE_URL</code>
              <p className="text-[10px] text-gray-500 mt-1.5">Value: postgresql://[user]:[password]@[host]/[dbname]?sslmode=require</p>
            </div>
            
            <div className="bg-gray-950 border border-gray-900 rounded-xl p-3.5 relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">Gemini API Key (Optional but recommended)</span>
                <button 
                  onClick={() => handleCopy("GEMINI_API_KEY", "gemini_key")}
                  className="text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
                >
                  {copiedText === "gemini_key" ? "Copied!" : "Copy Key"}
                </button>
              </div>
              <code className="text-xs text-white font-mono block select-all">GEMINI_API_KEY</code>
              <p className="text-[10px] text-gray-500 mt-1.5">Value: Your Google AI Studio API key (enables live multi-agent civic routing & synthesis).</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Deploy & Seed",
      icon: Terminal,
      color: "text-teal-400 border-teal-500/25 bg-teal-950/20",
      description: "Trigger a redeploy and seed data.",
      details: (
        <div className="space-y-4">
          <p className="text-gray-400 text-sm leading-relaxed">
            Prisma will automatically push the schema on deploy. To finalize, run the database seed command to establish initial administrator accounts and seed civic telemetry.
          </p>
          <div className="space-y-3">
            <div className="bg-gray-950 border border-gray-900 rounded-xl p-3.5">
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider block mb-1">Step 1: Redeploy App</span>
              <p className="text-gray-400 text-xs">
                In the Vercel dashboard, go to the <strong>Deployments</strong> tab, select your latest build, click <strong>Redeploy</strong>. Build logs will execute <code>prisma db push</code> automatically.
              </p>
            </div>
            <div className="bg-gray-950 border border-gray-900 rounded-xl p-3.5">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-wider">Step 2: Seed Telemetry Database</span>
                <button 
                  onClick={() => handleCopy("npx prisma db seed", "seed_cmd")}
                  className="text-[10px] font-mono text-gray-400 hover:text-white transition-colors"
                >
                  {copiedText === "seed_cmd" ? "Copied!" : "Copy Command"}
                </button>
              </div>
              <code className="text-xs text-gray-200 font-mono block select-all p-2 rounded bg-gray-900 border border-gray-800">npx prisma db seed</code>
              <p className="text-[10px] text-gray-500 mt-1.5">Run this locally in your workspace shell once your local <code>.env</code> file is configured with the target Postgres credentials.</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const ActiveIcon = steps[activeStep - 1].icon;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background radial overlays */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      {/* Main glassmorphic setup card */}
      <div className="max-w-3xl w-full bg-gray-900/30 border border-gray-850 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative z-10 flex flex-col gap-6 md:gap-8">
        
        {/* Header Block */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Environment Setup Required
            </h1>
            <p className="text-gray-400 text-xs mt-1">
              Your Nagar AI instance is missing essential database configuration parameters. Follow this guide to resolve it.
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-950/50 p-4 rounded-2xl border border-gray-900 shadow-inner">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${isDatabaseMissing ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-200">Database Engine (Postgres)</span>
              <span className="text-[10px] text-gray-500 mt-0.5">
                {isDatabaseMissing ? "DATABASE_URL environment variable is missing" : "Configured successfully"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-gray-850 pt-3 sm:pt-0 sm:pl-4">
            <div className={`w-2.5 h-2.5 rounded-full ${isGeminiMissing ? "bg-amber-500" : "bg-emerald-500"}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-200">Cognitive Engine (Gemini AI)</span>
              <span className="text-[10px] text-gray-500 mt-0.5">
                {isGeminiMissing ? "Operating in fallback Demo Mode (heuristics active)" : "Live AI classification active"}
              </span>
            </div>
          </div>
        </div>

        {/* Steps Tab Navigation */}
        <div className="flex border-b border-gray-850">
          {steps.map((step) => {
            const StepIcon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex-1 pb-3 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-all ${
                  isActive 
                    ? "border-cyan-500 text-white" 
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <StepIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Step {step.id}: {step.title.split(" ")[0]}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Step Panel Content */}
        <div className="min-h-[220px] flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${steps[activeStep - 1].color}`}>
              <ActiveIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Step {activeStep}: {steps[activeStep - 1].title}
              </h3>
              <p className="text-gray-500 text-[10px]">
                {steps[activeStep - 1].description}
              </p>
            </div>
          </div>

          <div className="flex-1 bg-gray-900/20 border border-gray-850/30 rounded-2xl p-5 shadow-inner">
            {steps[activeStep - 1].details}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center border-t border-gray-850 pt-6">
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 px-4 py-2.5 rounded-xl transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Check Status
          </button>
          
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button 
                onClick={() => setActiveStep(prev => prev - 1)}
                className="text-xs font-bold text-gray-400 hover:text-white px-4 py-2.5 transition-colors"
              >
                Back
              </button>
            )}
            {activeStep < 3 ? (
              <button 
                onClick={() => setActiveStep(prev => prev + 1)}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-gray-700 transition-colors"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button 
                onClick={() => {
                  // Direct to main workspace or documentation URL
                  window.location.reload();
                }}
                className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-gray-950 text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Finish Setup
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
