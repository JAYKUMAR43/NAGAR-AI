import Link from "next/link";
import { Shield, Sparkles, TrendingUp, Users, ArrowRight } from "lucide-react";
import CityClientWrapper from "@/components/3d/CityClientWrapper";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Header/Navbar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-25">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-lg shadow-cyan-500/20">
            N
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Nagar <span className="text-cyan-400">AI</span>
          </span>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-gray-300 hover:text-white px-4 py-2 transition-colors"
          >
            Official Dashboard
          </Link>
          <Link
            href="/report"
            className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            File a Report
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 pt-6 pb-20 items-center relative z-10">
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="inline-flex items-center gap-2 bg-cyan-950/40 border border-cyan-500/30 rounded-full px-4 py-1.5 text-xs font-semibold text-cyan-400 w-fit backdrop-blur-md shadow-inner shadow-cyan-500/5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Smart Community Engine</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            AI-Powered <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Decision Intelligence
            </span> <br />
            for Smart Cities
          </h1>

          <p className="text-gray-400 text-lg leading-relaxed max-w-xl">
            A multi-agent civic intelligence platform. Connects citizens and city officials
            with real-time anomaly detection, automated ticket routing, and conversational RAG insight models.
          </p>

          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/report"
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-950 px-6 py-3.5 rounded-xl font-bold tracking-wide shadow-xl shadow-cyan-500/10 transition-all hover:scale-[1.03] group"
            >
              Report Local Issue
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/dashboard"
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 px-6 py-3.5 rounded-xl font-semibold backdrop-blur-md transition-all hover:scale-[1.03]"
            >
              Access Admin Console
            </Link>
          </div>
        </div>

        {/* 3D City Container */}
        <div className="lg:col-span-6 h-[450px] md:h-[500px] w-full rounded-2xl border border-gray-800/80 bg-gray-950/50 backdrop-blur-xl relative overflow-hidden shadow-2xl shadow-cyan-500/5">
          <div className="absolute top-4 left-4 z-20 flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="absolute top-4 right-4 z-20 text-xs text-cyan-400 font-mono flex items-center gap-1.5 bg-gray-900/80 border border-cyan-500/25 px-2.5 py-1 rounded-md backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            3D WARD TELEMETRY
          </div>
          
          <CityClientWrapper />
        </div>
      </section>

      {/* Feature Cards Grid Section */}
      <section className="bg-gray-950/80 border-t border-gray-900 py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 flex flex-col gap-3">
            <h2 className="text-3xl font-bold">Platform Capabilities</h2>
            <p className="text-gray-400 text-sm">
              Empowering administrators with real-time operations dashboards and citizens with auto-assisted ticket submissions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-gray-900/40 border border-gray-900 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-3 group-hover:text-cyan-300 transition-colors">Incident Intake</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Gemini automatically audits citizen descriptions and uploaded images to classify categories and urgency.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-900/40 border border-gray-900 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-3 group-hover:text-indigo-300 transition-colors">Automatic Routing</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Tickets are instantly dispatched to appropriate utility boards based on categories analyzed from reports.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-900/40 border border-gray-900 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-purple-950/60 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-3 group-hover:text-purple-300 transition-colors">Semantic RAG Search</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Query reports and municipal rules using natural language to extract synthesized data summaries and maps.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-gray-900/40 border border-gray-900 rounded-2xl p-6 hover:border-cyan-500/30 transition-all group shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-teal-950/60 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold mb-3 group-hover:text-teal-300 transition-colors">Anomaly & Forecasts</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                Detect ward complaint surges statistically and review projected municipal loads using dynamic analytical charts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-950 py-8 text-center text-xs text-gray-500 bg-gray-950/90 relative z-10">
        <p>&copy; {new Date().getFullYear()} Nagar AI Municipal Platforms. All rights reserved.</p>
      </footer>
    </main>
  );
}
