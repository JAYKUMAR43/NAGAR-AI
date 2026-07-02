"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Authentication failed. Check credentials.");
      } else {
        // Successful login
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err: any) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md bg-gray-900/40 border border-gray-900 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-10 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/40 to-indigo-500/0" />

      {/* Header */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-black text-white text-xl tracking-wider shadow-lg shadow-cyan-500/20 mb-4">
          N
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-1.5 justify-center">
          Nagar <span className="text-cyan-400">AI</span>
        </h1>
        <p className="text-xs text-gray-400 font-medium mt-1">Official Administrative Console Access</p>
      </div>

      {/* Info Box about Seeded Accounts */}
      <div className="mb-6 p-3 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-[10px] text-cyan-300/80 leading-normal">
        <span className="font-bold text-cyan-400 uppercase tracking-wider block mb-1">Official Mock Credentials</span>
        Email: <code className="text-white">officer1@nagarai.gov</code> &bull; Pass: <code className="text-white">password</code>
      </div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-6 p-3.5 bg-red-950/30 border border-red-500/20 text-red-200 rounded-xl text-xs flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-gray-400 font-mono tracking-wider uppercase" htmlFor="email">
            Official Email Address
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@nagarai.gov"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none placeholder-gray-600 transition-colors"
              required
            />
            <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] text-gray-400 font-mono tracking-wider uppercase" htmlFor="password">
            Secure Password
          </label>
          <div className="relative">
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:border-cyan-500 focus:outline-none placeholder-gray-600 transition-colors"
              required
            />
            <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-gray-500" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-950 text-xs font-bold tracking-wider uppercase py-3.5 rounded-xl shadow-lg shadow-cyan-500/10 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:hover:scale-100"
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
          ) : (
            <>
              Verify Credentials
              <ArrowRight className="w-4 h-4 text-gray-950" />
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-cyan-500/10 blur-[150px] pointer-events-none rounded-full" />

      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-3 text-center text-gray-500 relative z-10">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest animate-pulse">Initializing Portal...</span>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
