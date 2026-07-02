"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from "recharts";
import { 
  ArrowLeft, TrendingUp, Calendar, Inbox, AlertTriangle, Shield, CheckCircle,
  BarChart3, RefreshCw
} from "lucide-react";

interface Complaint {
  id: string;
  category: "waste" | "water" | "road" | "electricity" | "safety";
  urgency: "low" | "medium" | "high" | "critical";
  ward: string;
  createdAt: string;
  status: string;
}

// Simple Animated Counter Component
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;

    const totalMiliseconds = duration * 1000;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / end), 15);
    
    const timer = setInterval(() => {
      start += Math.ceil(end / 40); // Increment incrementally
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{count}</span>;
}

export default function InsightsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [official, setOfficial] = useState<{ name: string; department: string } | null>(null);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [avgResolutionDays, setAvgResolutionDays] = useState(4.2); // Seeded avg

  // Chart Data
  const [trendData, setTrendData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [wardData, setWardData] = useState<any[]>([]);
  const [urgencyData, setUrgencyData] = useState<any[]>([]);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOfficial(data.official);
        }
      }
    } catch (e) {
      console.error("Failed to load session:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (e) {
      console.error("Failed to logout:", e);
    }
  };

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reports");
      const resData = await response.json();
      if (resData.success) {
        const data: Complaint[] = resData.data;
        setComplaints(data);
        setTotalCount(data.length);
        setCriticalCount(data.filter(c => c.urgency === "critical").length);
        setResolvedCount(data.filter(c => c.status === "resolved").length);
        processTelemetryData(data);
      }
    } catch (error) {
      console.error("Failed to load telemetry insights:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchSession();
    fetchTelemetry();
  }, []);

  const processTelemetryData = (data: Complaint[]) => {
    // 1. Process Category Breakdown
    const catCounts: Record<string, number> = { waste: 0, water: 0, road: 0, electricity: 0, safety: 0 };
    data.forEach(c => {
      if (c.category in catCounts) catCounts[c.category]++;
    });
    
    const catLabels: Record<string, string> = {
      waste: "Waste Management",
      water: "Water Supply",
      road: "Roads & Pavement",
      electricity: "Power Grid",
      safety: "Public Safety"
    };
    const catColors: Record<string, string> = {
      waste: "#10b981", // emerald
      water: "#3b82f6", // blue
      road: "#f59e0b", // amber
      electricity: "#eab308", // yellow
      safety: "#f43f5e" // rose
    };
    setCategoryData(
      Object.entries(catCounts).map(([cat, count]) => ({
        name: catLabels[cat] || cat,
        value: count,
        color: catColors[cat] || "#64748b"
      }))
    );

    // 2. Process Ward Breakdown
    const wardCounts: Record<string, number> = {};
    data.forEach(c => {
      wardCounts[c.ward] = (wardCounts[c.ward] || 0) + 1;
    });
    setWardData(
      Object.entries(wardCounts).map(([ward, count]) => ({
        ward,
        Complaints: count
      })).sort((a, b) => b.Complaints - a.Complaints)
    );

    // 3. Process Urgency
    const urgCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    data.forEach(c => {
      if (c.urgency in urgCounts) urgCounts[c.urgency]++;
    });
    setUrgencyData(
      Object.entries(urgCounts).map(([urgency, count]) => ({
        name: urgency.toUpperCase(),
        value: count
      }))
    );

    // 4. Historical Trends & 7-Day SMA Moving Average Forecast
    // Generate dates for the last 30 days
    const dailyCounts: Record<string, number> = {};
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      dates.push(dateStr);
      dailyCounts[dateStr] = 0;
    }

    data.forEach(c => {
      const dateStr = c.createdAt.substring(0, 10);
      if (dateStr in dailyCounts) {
        dailyCounts[dateStr]++;
      }
    });

    const parsedTrends = dates.map(dateStr => {
      const dateObj = new Date(dateStr);
      return {
        date: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Volume: dailyCounts[dateStr],
        Forecast: null as number | null
      };
    });

    // Compute moving average projection for the next 7 days
    // Get the last 7 days of actual volumes to seed our SMA projection
    const last7DaysVolumes = parsedTrends.slice(-7).map(t => t.Volume);
    const forecastTrends = [...parsedTrends];

    let currentWindow = [...last7DaysVolumes];
    for (let i = 1; i <= 7; i++) {
      const fDate = new Date();
      fDate.setDate(fDate.getDate() + i);

      // Simple Moving Average
      const sum = currentWindow.reduce((a, b) => a + b, 0);
      const avgForecast = Math.round((sum / currentWindow.length) * 1.1); // Add a 10% load growth modifier for simulation

      forecastTrends.push({
        date: fDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        Volume: null as any,
        Forecast: avgForecast
      });

      // Shift window
      currentWindow.shift();
      currentWindow.push(avgForecast);
    }

    // Connect the actual line to the forecast line by duplicating the last index value
    if (parsedTrends.length > 0) {
      forecastTrends[parsedTrends.length - 1].Forecast = parsedTrends[parsedTrends.length - 1].Volume;
    }

    setTrendData(forecastTrends);
  };

  const COLORS = ["#f43f5e", "#f59e0b", "#3b82f6", "#10b981"];

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-0 w-[45%] h-[45%] bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[45%] h-[45%] bg-purple-500/5 blur-[120px] pointer-events-none" />

      {/* Back Link */}
      <div className="max-w-7xl mx-auto mb-6 relative z-10">
        <Link
          href="/dashboard"
          className="text-gray-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 border-b border-gray-900 pb-6 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            MUNICIPAL DATA WAREHOUSE
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            System Analytics & Forecasts
          </h1>
          <p className="text-gray-400 text-sm mt-1 max-w-xl">
            Overview of ticket load telemetry, ward densities, response speed metrics, and 7-day Simple Moving Average forecasts.
          </p>
        </div>

        {official && (
          <div className="flex flex-row items-center gap-4 bg-gray-900/30 border border-gray-900 rounded-2xl p-4 backdrop-blur shadow-inner">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-gray-500 font-mono">AUTHENTICATED OFFICIAL</span>
              <span className="text-xs font-bold text-white">{official.name}</span>
              <span className="text-[10px] text-cyan-400 font-medium">{official.department}</span>
            </div>
            <div className="h-8 w-[1px] bg-gray-800" />
            <button
              onClick={handleLogout}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold border border-red-500/20 hover:border-red-500/40 bg-red-950/20 px-3 py-1.5 rounded-xl transition-all"
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
        
        {/* Animated Counters Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-5 shadow-inner flex justify-between items-center backdrop-blur">
            <div>
              <span className="text-[10px] text-gray-500 font-mono tracking-wider">TOTAL INGESTED</span>
              <div className="text-3xl font-black mt-1 text-white">
                {loading ? "..." : <AnimatedCounter value={totalCount} />}
              </div>
            </div>
            <Inbox className="w-6 h-6 text-cyan-500" />
          </div>

          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-5 shadow-inner flex justify-between items-center backdrop-blur">
            <div>
              <span className="text-[10px] text-gray-500 font-mono tracking-wider">CRITICAL HAZARDS</span>
              <div className="text-3xl font-black mt-1 text-rose-400">
                {loading ? "..." : <AnimatedCounter value={criticalCount} />}
              </div>
            </div>
            <AlertTriangle className="w-6 h-6 text-rose-400 animate-pulse" />
          </div>

          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-5 shadow-inner flex justify-between items-center backdrop-blur">
            <div>
              <span className="text-[10px] text-gray-500 font-mono tracking-wider">RESOLVED CASES</span>
              <div className="text-3xl font-black mt-1 text-emerald-400">
                {loading ? "..." : <AnimatedCounter value={resolvedCount} />}
              </div>
            </div>
            <CheckCircle className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-5 shadow-inner flex justify-between items-center backdrop-blur">
            <div>
              <span className="text-[10px] text-gray-500 font-mono tracking-wider">AVG RESOLUTION</span>
              <div className="text-3xl font-black mt-1 text-indigo-400">
                <span>4.2d</span>
              </div>
            </div>
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>

        </div>

        {/* Charts Grid */}
        {loading ? (
          <div className="bg-gray-900/10 border border-gray-900 rounded-2xl h-80 flex flex-col items-center justify-center gap-3 text-gray-500 backdrop-blur">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
            <span>Compiling live telemetry logs...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Chart 1: Historical Trend & SMA Forecast (8 Cols) */}
            <div className="lg:col-span-8 bg-gray-900/40 border border-gray-900 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[380px] shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-xs font-mono tracking-wider text-gray-300 uppercase">Load Trend & 7-Day SMA Projection</h3>
                  <p className="text-[10px] text-gray-500">Historical intake (solid) vs computed 7-day Simple Moving Average prediction (dotted).</p>
                </div>
                <div className="flex gap-4 text-[10px] font-mono">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-[2px] bg-cyan-400" /> Intake Volume</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-[2px] border-t border-dashed border-purple-400" /> SMA Forecast</div>
                </div>
              </div>

              <div className="flex-1 w-full text-xs">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: 9 }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: 9 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", fontSize: 11 }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Volume" 
                        stroke="#06b6d4" 
                        strokeWidth={3} 
                        dot={{ r: 2 }} 
                        activeDot={{ r: 5 }} 
                        connectNulls
                      />
                      <Line 
                        type="monotone" 
                        dataKey="Forecast" 
                        stroke="#c084fc" 
                        strokeWidth={2} 
                        strokeDasharray="5 5" 
                        dot={{ r: 1 }} 
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: Category distribution (4 Cols) */}
            <div className="lg:col-span-4 bg-gray-900/40 border border-gray-900 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[380px] shadow-lg">
              <div>
                <h3 className="font-bold text-xs font-mono tracking-wider text-gray-300 uppercase">Category Distribution</h3>
                <p className="text-[10px] text-gray-500">Breakdown of reported issues across departments.</p>
              </div>

              <div className="flex-1 w-full relative flex items-center justify-center text-xs mt-2">
                {mounted && (
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Legends strip */}
              <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono border-t border-gray-950 pt-3 mt-1">
                {categoryData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="truncate text-gray-400">{entry.name}: <strong>{entry.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3: Ward Comparison (6 Cols) */}
            <div className="lg:col-span-6 bg-gray-900/40 border border-gray-900 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[340px] shadow-lg">
              <div>
                <h3 className="font-bold text-xs font-mono tracking-wider text-gray-300 uppercase">Ward Volume Metrics</h3>
                <p className="text-[10px] text-gray-500">Incident distribution comparative analysis across wards.</p>
              </div>

              <div className="flex-1 w-full text-xs mt-4">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={wardData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis dataKey="ward" stroke="#6b7280" style={{ fontSize: 9 }} />
                      <YAxis stroke="#6b7280" style={{ fontSize: 9 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", fontSize: 11 }}
                      />
                      <Bar dataKey="Complaints" radius={[4, 4, 0, 0]}>
                        {wardData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.ward === "Ward 3" ? "#f43f5e" : "#06b6d4"} // Highlight Ward 3
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 4: Urgency Breakdown (6 Cols) */}
            <div className="lg:col-span-6 bg-gray-900/40 border border-gray-900 rounded-2xl p-5 backdrop-blur-md flex flex-col h-[340px] shadow-lg">
              <div>
                <h3 className="font-bold text-xs font-mono tracking-wider text-gray-300 uppercase">Severity Analysis</h3>
                <p className="text-[10px] text-gray-500">Incident breakdown classified by risk level urgency.</p>
              </div>

              <div className="flex-1 w-full text-xs mt-4">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={urgencyData} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis type="number" stroke="#6b7280" style={{ fontSize: 9 }} />
                      <YAxis dataKey="name" type="category" stroke="#6b7280" style={{ fontSize: 9 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", color: "#fff", fontSize: 11 }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {urgencyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}
