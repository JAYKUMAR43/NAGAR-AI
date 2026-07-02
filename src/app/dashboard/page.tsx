"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, AlertTriangle, Search, Sparkles, Filter, Info, 
  MapPin, CheckCircle, Clock, Send, Database, FileText, ChevronRight,
  TrendingUp, RefreshCw, BarChart3, HelpCircle, Eye, User, LogOut, Plus, Download, Check, Camera, Activity
} from "lucide-react";

// Types matching Schema
interface Complaint {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category: "waste" | "water" | "road" | "electricity" | "safety";
  urgency: "low" | "medium" | "high" | "critical";
  ward: "Ward 1" | "Ward 2" | "Ward 3" | "Ward 4" | "Ward 5";
  status: "pending" | "routed" | "in_progress" | "resolved";
  assignedDept: string;
  latitude: number;
  longitude: number;
  citizenName: string;
  citizenPhone: string;
  createdAt: string;
}

interface ActionLog {
  id: string;
  complaintId: string;
  timestamp: string;
  actionType: string;
  notes: string;
  officialName: string;
  photoUrl: string | null;
}

interface Anomaly {
  ward: string;
  category: string;
  date: string;
  count: number;
  avg: number;
  severity: "high" | "critical";
}

const wards = ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"];

const wardColors: Record<string, string> = {
  "Ward 1": "fill-indigo-900/50 stroke-indigo-500 hover:fill-indigo-800/60",
  "Ward 2": "fill-blue-900/50 stroke-blue-500 hover:fill-blue-800/60",
  "Ward 3": "fill-red-950/40 stroke-red-500 hover:fill-red-900/40", // Has the water anomaly
  "Ward 4": "fill-emerald-900/50 stroke-emerald-500 hover:fill-emerald-800/60",
  "Ward 5": "fill-purple-900/50 stroke-purple-500 hover:fill-purple-800/60"
};

const categoryLabels: Record<string, string> = {
  waste: "Waste Management",
  water: "Water Supply",
  road: "Roads & Footpaths",
  electricity: "Power Grid",
  safety: "Public Safety"
};

export default function DashboardPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  // Official Session
  const [official, setOfficial] = useState<{ name: string; department: string; email: string; wardAssigned: string } | null>(null);

  // Filters
  const [selectedWard, setSelectedWard] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  // RAG Search State
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiSources, setAiSources] = useState<any[]>([]);

  // Selected ticket for detailed view & Routing simulation
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [routingStep, setRoutingStep] = useState(0);

  // Actions Taken State
  const [activeTab, setActiveTab] = useState<"details" | "actions">("details");
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [newActionType, setNewActionType] = useState<string>("Note");
  const [newActionNotes, setNewActionNotes] = useState<string>("");
  const [newActionStatus, setNewActionStatus] = useState<string>("in_progress");
  const [newActionPhotoUrl, setNewActionPhotoUrl] = useState<string>("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Ward Report Generator State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [generatedReportText, setGeneratedReportText] = useState("");
  const [generatedReportStats, setGeneratedReportStats] = useState<{ total: number; pending: number; inProgress: number; resolved: number } | null>(null);

  // Anomaly Alerts
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  // Fetch session
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

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/admin/login";
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  // Fetch complaints
  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/reports");
      const resData = await response.json();
      if (resData.success) {
        setComplaints(resData.data);
        setFilteredComplaints(resData.data);
        detectAnomalies(resData.data);
      }
    } catch (error) {
      console.error("Failed to load complaints:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Action Logs
  const fetchActionLogs = async (complaintId: string) => {
    setActionsLoading(true);
    try {
      const response = await fetch(`/api/reports/actions?complaintId=${complaintId}`);
      const resData = await response.json();
      if (resData.success) {
        setActionLogs(resData.data);
      }
    } catch (error) {
      console.error("Failed to load action logs:", error);
    } finally {
      setActionsLoading(false);
    }
  };

  // Add Action Log
  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint || !newActionType.trim() || !newActionNotes.trim()) return;

    setIsSubmittingAction(true);
    try {
      let resolvedStatus = undefined;
      if (newActionType === "Mark resolved") {
        resolvedStatus = "resolved";
      } else if (newActionType === "Field visit logged") {
        resolvedStatus = "in_progress";
      } else if (newActionType === "Status change") {
        resolvedStatus = newActionStatus;
      }

      const res = await fetch("/api/reports/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: selectedComplaint.id,
          actionType: newActionType,
          notes: newActionNotes,
          newStatus: resolvedStatus,
          photoUrl: newActionPhotoUrl || null
        }),
      });

      const resData = await res.json();
      if (resData.success) {
        const addedLog = resData.data;
        setActionLogs(prev => [...prev, addedLog]);
        
        // Reset form fields
        setNewActionNotes("");
        setNewActionPhotoUrl("");

        // Dynamically update status in main state if changed
        if (resolvedStatus) {
          setSelectedComplaint(prev => prev ? { ...prev, status: resolvedStatus as any } : null);
          setComplaints(prev => prev.map(c => c.id === selectedComplaint.id ? { ...c, status: resolvedStatus as any } : c));
        }
      } else {
        alert("Failed to submit update: " + resData.error);
      }
    } catch (err: any) {
      alert("Error submitting action update: " + err.message);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Generate Ward Report
  const handleGenerateWardReport = async (ward: string) => {
    if (!ward || ward === "all") return;
    setIsGeneratingReport(true);
    setIsReportModalOpen(true);
    setGeneratedReportText("");
    setGeneratedReportStats(null);
    try {
      const res = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ward }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedReportText(data.report);
        setGeneratedReportStats(data.stats);
      } else {
        setGeneratedReportText("Failed to generate ward report: " + data.error);
      }
    } catch (err: any) {
      setGeneratedReportText("Failed to connect to AI engine: " + err.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Download report as .txt
  const handleDownloadReport = (wardName: string) => {
    const element = document.createElement("a");
    const file = new Blob([generatedReportText], { type: "text/plain;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `NagarAI_Executive_Report_${wardName.replace(/\s+/g, "_")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Export complaints as .csv
  const handleExportCSV = (wardName: string) => {
    const wardComplaints = complaints.filter((c) => c.ward === wardName);
    const headers = ["Ticket ID", "Title", "Category", "Urgency", "Status", "Department", "Citizen Name", "Citizen Phone", "Date Created"];
    const rows = wardComplaints.map((c) => [
      c.id,
      `"${c.title.replace(/"/g, '""')}"`,
      c.category,
      c.urgency,
      c.status,
      `"${c.assignedDept}"`,
      `"${c.citizenName.replace(/"/g, '""')}"`,
      c.citizenPhone,
      new Date(c.createdAt).toLocaleString()
    ]);
    
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `NagarAI_Ward_Complaints_${wardName.replace(/\s+/g, "_")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchSession();
    fetchComplaints();
  }, []);

  // Filter Trigger
  useEffect(() => {
    let result = complaints;
    if (selectedWard !== "all") {
      result = result.filter(c => c.ward === selectedWard);
    }
    if (selectedCategory !== "all") {
      result = result.filter(c => c.category === selectedCategory);
    }
    if (selectedStatus !== "all") {
      result = result.filter(c => c.status === selectedStatus);
    }
    if (searchText.trim() !== "") {
      const query = searchText.toLowerCase();
      result = result.filter(c => 
        c.title.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.citizenName.toLowerCase().includes(query) ||
        c.assignedDept.toLowerCase().includes(query)
      );
    }
    setFilteredComplaints(result);
  }, [selectedWard, selectedCategory, selectedStatus, searchText, complaints]);

  // Statistical Anomaly Detection Heuristic
  const detectAnomalies = (data: Complaint[]) => {
    // 1. Group complaints by Date, Ward, Category
    const groups: Record<string, number> = {};
    const historicalSeries: Record<string, number[]> = {}; // key: ward_category, values: list of daily counts

    data.forEach(c => {
      const dateStr = c.createdAt.substring(0, 10); // YYYY-MM-DD
      const groupKey = `${dateStr}_${c.ward}_${c.category}`;
      groups[groupKey] = (groups[groupKey] || 0) + 1;

      const seriesKey = `${c.ward}_${c.category}`;
      if (!historicalSeries[seriesKey]) historicalSeries[seriesKey] = [];
    });

    // Populate historical daily counts
    // For each unique series, construct an array of counts for the last 30 days
    const uniqueKeys = Object.keys(historicalSeries);
    const dateKeys: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateKeys.push(d.toISOString().substring(0, 10));
    }

    uniqueKeys.forEach(seriesKey => {
      const [ward, cat] = seriesKey.split("_");
      dateKeys.forEach(dateStr => {
        const groupKey = `${dateStr}_${ward}_${cat}`;
        const count = groups[groupKey] || 0;
        historicalSeries[seriesKey].push(count);
      });
    });

    // Detect anomalies
    const detected: Anomaly[] = [];
    Object.entries(groups).forEach(([key, count]) => {
      const [dateStr, ward, cat] = key.split("_");
      const seriesKey = `${ward}_${cat}`;
      const counts = historicalSeries[seriesKey] || [];
      
      if (counts.length < 5) return;

      // Mean
      const sum = counts.reduce((a, b) => a + b, 0);
      const avg = sum / counts.length;
      
      // Standard deviation
      const sqDiff = counts.map(x => Math.pow(x - avg, 2));
      const variance = sqDiff.reduce((a, b) => a + b, 0) / counts.length;
      const stdDev = Math.sqrt(variance);

      // If count > Mean + 2 * stdDev AND count > 2 (to avoid low sample alerts)
      if (count > avg + 2.0 * stdDev && count >= 3) {
        // Double check we don't alert the same ward/category twice (just show the latest day's)
        const date = new Date(dateStr);
        detected.push({
          ward,
          category: cat,
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          count,
          avg: parseFloat(avg.toFixed(1)),
          severity: count > avg + 3.0 * stdDev ? "critical" : "high"
        });
      }
    });

    // Sort: show critical/high first, latest first
    setAnomalies(detected.slice(0, 3));
  };

  // Trigger Routing simulation when complaint is selected
  const selectComplaintForDetails = (comp: Complaint) => {
    setSelectedComplaint(comp);
    setActiveTab("details");
    fetchActionLogs(comp.id);

    // Initial state based on current status
    if (comp.status === "pending") {
      setRoutingStep(1); // Ingestion
      setTimeout(() => setRoutingStep(2), 800); // Trigger audit step
    } else if (comp.status === "routed") {
      setRoutingStep(2);
      setTimeout(() => setRoutingStep(3), 800);
    } else if (comp.status === "in_progress") {
      setRoutingStep(3);
      setTimeout(() => setRoutingStep(4), 800);
    } else if (comp.status === "resolved") {
      setRoutingStep(4);
    }
  };

  // Submit RAG search
  const handleRAGSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setAiLoading(true);
    setAiAnswer("");
    setAiSources([]);
    try {
      const response = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery })
      });
      const data = await response.json();
      if (data.success) {
        setAiAnswer(data.answer);
        setAiSources(data.sources);
      } else {
        setAiAnswer("RAG Search failed: " + data.error);
      }
    } catch (error: any) {
      setAiAnswer("Network error during RAG: " + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Ward Click Mapper
  const handleWardClick = (wardName: string) => {
    setSelectedWard(prev => (prev === wardName ? "all" : wardName));
  };

  // Helper for metrics counts
  const pendingCount = complaints.filter(c => c.status === "pending").length;
  const inProgressCount = complaints.filter(c => c.status === "in_progress").length;
  const resolvedCount = complaints.filter(c => c.status === "resolved").length;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-teal-500/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 border-b border-gray-900 pb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            LIVE TELEMETRY ACTIVE
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2 flex-wrap">
            Nagar AI <span className="text-cyan-500 font-medium text-lg border border-cyan-500/30 px-2.5 py-0.5 rounded-lg bg-cyan-950/20 backdrop-blur">Decision Intelligence Console</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {official && (
            <div className="flex items-center gap-3 bg-gray-900/30 border border-gray-900 rounded-xl px-4 py-2.5 backdrop-blur shadow-inner text-xs">
              <div className="flex flex-col text-right">
                <span className="text-[9px] text-gray-500 font-mono leading-none mb-0.5">Logged in as</span>
                <span className="font-bold text-white">{official.name}</span>
                <span className="text-[9px] text-cyan-400 font-medium">{official.department}</span>
              </div>
              <div className="h-6 w-[1px] bg-gray-800" />
              <button
                onClick={handleLogout}
                className="text-[10px] text-red-450 hover:text-red-400 font-bold border border-red-500/20 hover:border-red-500/40 bg-red-950/15 p-1.5 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <Link
            href="/insights"
            className="flex items-center gap-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all"
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            Telemetry Analytics
          </Link>
          <Link
            href="/report"
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-950 text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-cyan-500/10 transition-all hover:scale-[1.01]"
          >
            File Citizen Report
          </Link>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Metric Cards Banner (12 Cols) */}
        <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-4 flex justify-between items-center backdrop-blur shadow-inner">
            <div>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider block">TOTAL DISPATCHED</span>
              <span className="text-2xl font-black mt-1 block">{loading ? "..." : complaints.length}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gray-800/80 border border-gray-700 flex items-center justify-center text-cyan-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-4 flex justify-between items-center backdrop-blur shadow-inner">
            <div>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider block">PENDING VERIFICATION</span>
              <span className="text-2xl font-black mt-1 block">{loading ? "..." : pendingCount}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-yellow-950/40 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-4 flex justify-between items-center backdrop-blur shadow-inner">
            <div>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider block">ACTIVE DISPATCHED</span>
              <span className="text-2xl font-black mt-1 block">{loading ? "..." : inProgressCount}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="bg-gray-900/30 border border-gray-900 rounded-xl p-4 flex justify-between items-center backdrop-blur shadow-inner">
            <div>
              <span className="text-[10px] text-gray-400 font-mono tracking-wider block">COMPLETED TICKETS</span>
              <span className="text-2xl font-black mt-1 block">{loading ? "..." : resolvedCount}</span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* LEFT COLUMN: Map & Anomalies (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* SVG map */}
          <div className="bg-gray-900/40 border border-gray-900 rounded-xl p-5 backdrop-blur-md shadow-xl flex flex-col min-h-[360px]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold tracking-wider text-gray-300 font-mono">WARD INCIDENT TELEMETRY MAP</h2>
              <span className="text-[10px] text-gray-400 bg-gray-950 border border-gray-800 px-2 py-0.5 rounded">Click ward to filter list</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center">
              <svg viewBox="0 0 500 350" className="w-full max-w-[420px] h-auto drop-shadow-2xl">
                {/* Ward 2: North */}
                <polygon 
                  points="50,50 450,50 350,150 150,150" 
                  className={`transition-all duration-300 cursor-pointer stroke-2 ${
                    selectedWard === "Ward 2" ? "fill-cyan-500/50 stroke-cyan-400" : wardColors["Ward 2"]
                  }`}
                  onClick={() => handleWardClick("Ward 2")}
                />
                <text x="250" y="100" className="fill-white font-bold text-xs pointer-events-none text-center select-none" textAnchor="middle">
                  Ward 2 (North)
                </text>

                {/* Ward 5: West */}
                <polygon 
                  points="50,50 150,150 150,250 50,300" 
                  className={`transition-all duration-300 cursor-pointer stroke-2 ${
                    selectedWard === "Ward 5" ? "fill-cyan-500/50 stroke-cyan-400" : wardColors["Ward 5"]
                  }`}
                  onClick={() => handleWardClick("Ward 5")}
                />
                <text x="100" y="180" className="fill-white font-bold text-xs pointer-events-none select-none" textAnchor="middle">
                  Ward 5 (West)
                </text>

                {/* Ward 1: Central */}
                <polygon 
                  points="150,150 350,150 350,250 150,250" 
                  className={`transition-all duration-300 cursor-pointer stroke-2 ${
                    selectedWard === "Ward 1" ? "fill-cyan-500/50 stroke-cyan-400" : wardColors["Ward 1"]
                  }`}
                  onClick={() => handleWardClick("Ward 1")}
                />
                <text x="250" y="205" className="fill-white font-bold text-xs pointer-events-none select-none" textAnchor="middle">
                  Ward 1 (Central)
                </text>

                {/* Ward 4: East */}
                <polygon 
                  points="450,50 450,300 350,250 350,150" 
                  className={`transition-all duration-300 cursor-pointer stroke-2 ${
                    selectedWard === "Ward 4" ? "fill-cyan-500/50 stroke-cyan-400" : wardColors["Ward 4"]
                  }`}
                  onClick={() => handleWardClick("Ward 4")}
                />
                <text x="400" y="180" className="fill-white font-bold text-xs pointer-events-none select-none" textAnchor="middle">
                  Ward 4 (East)
                </text>

                {/* Ward 3: South (Red hot) */}
                <polygon 
                  points="150,250 350,250 450,300 50,300" 
                  className={`transition-all duration-300 cursor-pointer stroke-2 ${
                    selectedWard === "Ward 3" ? "fill-red-500/40 stroke-red-400" : wardColors["Ward 3"]
                  }`}
                  onClick={() => handleWardClick("Ward 3")}
                />
                <text x="250" y="285" className="fill-white font-bold text-xs pointer-events-none select-none" textAnchor="middle">
                  Ward 3 (South) ⚠️
                </text>
              </svg>
            </div>
          </div>

          {/* Anomaly Alerts Widget */}
          <div className="bg-gray-900/40 border border-gray-900 rounded-xl p-5 backdrop-blur-md shadow-xl flex-1">
            <h2 className="text-sm font-bold tracking-wider text-gray-300 mb-4 font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              STATISTICAL ANOMALY SURGE ALERTS
            </h2>
            
            <div className="flex flex-col gap-3">
              {anomalies.length > 0 ? (
                anomalies.map((anom, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-md relative overflow-hidden ${
                      anom.severity === "critical" 
                        ? "bg-red-950/20 border-red-500/30 text-red-200" 
                        : "bg-amber-950/20 border-amber-500/30 text-amber-200"
                    }`}
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-xl rounded-full" />
                    
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      anom.severity === "critical" ? "bg-red-950 border border-red-500/30 text-red-400" : "bg-amber-950 border border-amber-500/30 text-amber-400"
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs uppercase tracking-wider text-white">
                          {anom.ward} &bull; {categoryLabels[anom.category] || anom.category}
                        </span>
                        <span className="text-[10px] font-mono opacity-80">{anom.date}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Statistical spike detected: Daily volume reached <strong className="text-white">{anom.count} tickets</strong> (Average load: {anom.avg} tickets/day).
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button 
                          onClick={() => {
                            setSelectedWard(anom.ward);
                            setSelectedCategory(anom.category);
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors ${
                            anom.severity === "critical" ? "bg-red-900/40 hover:bg-red-900/60 text-white" : "bg-amber-900/40 hover:bg-amber-900/60 text-white"
                          }`}
                        >
                          Isolate Ward Tickets
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-gray-500 font-medium">
                  No statistical anomalies or volume surges detected in any sector.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Ask Nagar AI RAG (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-gray-900/40 border border-gray-900 rounded-xl p-5 backdrop-blur-md shadow-xl flex flex-col flex-1 min-h-[500px]">
            <div className="flex items-center gap-2 border-b border-gray-900 pb-3 mb-4">
              <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div>
                <h2 className="text-sm font-bold text-gray-200">Ask Nagar AI Console</h2>
                <p className="text-[10px] text-gray-400">Natural language search using custom RAG logic over database.</p>
              </div>
            </div>

            {/* RAG Ask Form */}
            <form onSubmit={handleRAGSearch} className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g. Which ward has water issues?"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none placeholder-gray-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !aiQuery.trim()}
                  className="absolute right-2 top-1.5 text-cyan-400 hover:text-cyan-300 disabled:text-gray-700 p-1.5 transition-colors"
                >
                  {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>

            {/* RAG response pane */}
            <div className="flex-1 bg-gray-950/80 border border-gray-900 rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-[320px] scrollbar-thin flex flex-col shadow-inner">
              {aiLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center text-gray-500">
                  <div className="w-10 h-10 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                  <span>AI is embedding query, retrieving matching vectors, and synthesizing reasoning...</span>
                </div>
              ) : aiAnswer ? (
                <div className="flex-grow flex flex-col gap-4 text-gray-300 font-sans leading-relaxed text-xs">
                  <div className="border-b border-gray-900 pb-2 flex justify-between items-center text-[10px] font-mono text-cyan-400">
                    <span>NAGAR-AI SYNTHESIS</span>
                    <span>● OK</span>
                  </div>
                  
                  <div className="whitespace-pre-line">{aiAnswer}</div>

                  {/* Sources display */}
                  {aiSources.length > 0 && (
                    <div className="mt-4 border-t border-gray-900 pt-3">
                      <h4 className="text-[10px] font-bold text-gray-500 tracking-wider mb-2 font-mono uppercase">RETRIEVED VECTOR SOURCES:</h4>
                      <div className="flex flex-wrap gap-2">
                        {aiSources.map((source, idx) => {
                          const isPolicy = source.type === "policy";
                          return (
                            <button
                              key={source.id}
                              onClick={() => {
                                // Find complaint and select it if click matches a complaint
                                if (!isPolicy) {
                                  const c = complaints.find(item => item.id === source.id);
                                  if (c) selectComplaintForDetails(c);
                                }
                              }}
                              className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                                isPolicy 
                                  ? "bg-purple-950/30 border-purple-500/30 text-purple-300"
                                  : "bg-blue-950/30 border-blue-500/30 text-blue-300 hover:border-blue-400"
                              }`}
                              title={source.text}
                            >
                              {isPolicy ? "Policy:" : "Ticket:"} {source.metadata.title ? source.metadata.title.substring(0, 18) : "Record"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-gray-600 font-sans">
                  <HelpCircle className="w-8 h-8 text-gray-700" />
                  <span>Type a natural language question above to query Nagar AI over seeded database & policies.</span>
                  <span className="text-[10px] text-gray-700 max-w-[200px]">We perform similarity mapping dynamically.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Tickets Table & Ticket Details (12 Cols) */}
        <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Complaints Table (7 Cols) */}
          <div className="md:col-span-7 bg-gray-900/40 border border-gray-900 rounded-xl p-5 backdrop-blur-md shadow-xl flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-950 pb-4 mb-4">
              <h2 className="text-sm font-bold tracking-wider text-gray-300 font-mono">CIVIC COMPLAINTS TELEMETRY</h2>
              
              {/* Reset filter badge */}
              {(selectedWard !== "all" || selectedCategory !== "all" || selectedStatus !== "all" || searchText) && (
                <button
                  onClick={() => {
                    setSelectedWard("all");
                    setSelectedCategory("all");
                    setSelectedStatus("all");
                    setSearchText("");
                  }}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Clear Filters
                </button>
              )}
            </div>

            {/* Filters Row */}
            <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3 mb-4 text-xs">
              <div className="flex-grow grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <select
                    value={selectedWard}
                    onChange={(e) => setSelectedWard(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Wards</option>
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(categoryLabels).map(([id, label]) => (
                      <option key={id} value={id}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 text-xs focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="routed">Routed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="relative col-span-2 sm:col-span-1">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search description..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-7 pr-2 py-1.5 text-xs focus:border-cyan-500 focus:outline-none placeholder-gray-600"
                  />
                  <Search className="absolute left-2.5 top-2.25 w-3 h-3 text-gray-500" />
                </div>
              </div>
              {selectedWard !== "all" && (
                <button
                  onClick={() => handleGenerateWardReport(selectedWard)}
                  className="bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 px-3.5 py-1.5 rounded-lg flex items-center justify-center gap-1.5 font-bold transition-all shadow-md shadow-cyan-500/5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate Ward Report
                </button>
              )}
            </div>

            {/* Database Table Panel */}
            <div className="overflow-x-auto border border-gray-950 rounded-lg max-h-[380px] scrollbar-thin">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-950 text-gray-400 font-mono border-b border-gray-900">
                    <th className="p-3">Complaint</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Ward</th>
                    <th className="p-3">Urgency</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-500" />
                        Loading database complaints...
                      </td>
                    </tr>
                  ) : filteredComplaints.length > 0 ? (
                    filteredComplaints.map((comp) => (
                      <tr 
                        key={comp.id} 
                        className={`border-b border-gray-950/60 hover:bg-gray-900/30 transition-all cursor-pointer ${
                          selectedComplaint?.id === comp.id ? "bg-cyan-950/15" : ""
                        }`}
                        onClick={() => selectComplaintForDetails(comp)}
                      >
                        <td className="p-3 font-semibold max-w-[200px] truncate">
                          <div>{comp.title}</div>
                          <div className="text-[10px] font-normal text-gray-500 truncate mt-0.5">{comp.description}</div>
                        </td>
                        <td className="p-3 capitalize font-mono text-[10px] text-gray-300">{comp.category}</td>
                        <td className="p-3 text-gray-300">{comp.ward}</td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                            comp.urgency === "critical" ? "bg-red-950 text-red-400 border border-red-500/20" :
                            comp.urgency === "high" ? "bg-amber-950 text-amber-400 border border-amber-500/20" :
                            comp.urgency === "medium" ? "bg-blue-950 text-blue-400 border border-blue-500/20" :
                            "bg-gray-800 text-gray-300"
                          }`}>
                            {comp.urgency}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] capitalize ${
                            comp.status === "resolved" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" :
                            comp.status === "in_progress" ? "bg-cyan-950 text-cyan-400 border border-cyan-500/20" :
                            comp.status === "routed" ? "bg-indigo-950 text-indigo-400 border border-indigo-500/20" :
                            "bg-yellow-950 text-yellow-400 border border-yellow-500/20"
                          }`}>
                            {comp.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              selectComplaintForDetails(comp);
                            }}
                            className="bg-gray-950 hover:bg-gray-800 border border-gray-800 hover:border-cyan-500/30 p-1.5 rounded-lg text-cyan-400 transition-all inline-flex items-center"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-gray-500 font-medium">
                        No complaints match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {/* Ticket Details & Routing Visual (5 Cols) */}
          <div className="md:col-span-5 bg-gray-900/40 border border-gray-950/80 hover:border-cyan-500/20 rounded-xl p-5 backdrop-blur-md shadow-xl flex flex-col min-h-[480px] transition-all relative overflow-hidden">
            {selectedComplaint && (
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 blur-xl rounded-full pointer-events-none" />
            )}
            
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold tracking-wider text-gray-300 font-mono flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                INCIDENT DISPATCH DRAWER
              </h2>
              {selectedComplaint && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveTab("details")}
                    className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border transition-all ${
                      activeTab === "details"
                        ? "bg-cyan-950 border-cyan-500/40 text-cyan-400"
                        : "bg-gray-950 border-gray-900 text-gray-400 hover:text-white"
                    }`}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-lg border transition-all ${
                      activeTab === "actions"
                        ? "bg-cyan-950 border-cyan-500/40 text-cyan-400"
                        : "bg-gray-950 border-gray-900 text-gray-400 hover:text-white"
                    }`}
                  >
                    Actions & Updates
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {selectedComplaint ? (
                <motion.div
                  key={selectedComplaint.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex-grow flex flex-col"
                >
                  {/* Common Header Specs */}
                  <div className="border-b border-gray-950 pb-3 mb-4 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-extrabold text-sm text-white leading-tight">{selectedComplaint.title}</h3>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                          selectedComplaint.urgency === "critical" ? "bg-red-950 text-red-400 border border-red-500/20" :
                          selectedComplaint.urgency === "high" ? "bg-amber-950 text-amber-400 border border-amber-500/20" :
                          selectedComplaint.urgency === "medium" ? "bg-blue-950 text-blue-400 border border-blue-500/20" :
                          "bg-gray-800 text-gray-300"
                        }`}>
                          {selectedComplaint.urgency}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] capitalize ${
                          selectedComplaint.status === "resolved" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/20" :
                          selectedComplaint.status === "in_progress" ? "bg-cyan-950 text-cyan-400 border border-cyan-500/20" :
                          selectedComplaint.status === "routed" ? "bg-indigo-950 text-indigo-400 border border-indigo-500/20" :
                          "bg-yellow-950 text-yellow-400 border border-yellow-500/20"
                        }`}>
                          {selectedComplaint.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-500 font-mono">
                      Filed: {new Date(selectedComplaint.createdAt).toLocaleString()}
                    </div>
                  </div>

                  {activeTab === "details" ? (
                    /* Tab 1: Detailed Specifications & Stepper Timeline */
                    <div className="flex-grow flex flex-col gap-4 overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
                      <div className="bg-gray-950/40 border border-gray-950 rounded-xl p-3.5 leading-relaxed text-xs text-gray-300">
                        <strong className="text-gray-400 font-bold block mb-1">Description:</strong>
                        {selectedComplaint.description}
                      </div>

                      {/* Citizen Info Card (Better Padding) */}
                      <div className="bg-gray-950/40 border border-gray-950 rounded-xl p-4 grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] text-gray-500 font-mono uppercase block mb-1">Citizen Contact</span>
                          <span className="font-bold text-gray-200 block">{selectedComplaint.citizenName}</span>
                          <span className="text-gray-400 text-[10px] block mt-0.5">{selectedComplaint.citizenPhone}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 font-mono uppercase block mb-1">Assigned Location</span>
                          <span className="font-bold text-cyan-400 block">{selectedComplaint.ward}</span>
                          <span className="text-gray-400 text-[9px] font-mono block mt-0.5">GPS: {selectedComplaint.latitude.toFixed(4)}, {selectedComplaint.longitude.toFixed(4)}</span>
                        </div>
                      </div>

                      {/* Redesigned Vertical Stepper Timeline */}
                      <div className="mt-2 border-t border-gray-950 pt-4">
                        <span className="text-[10px] text-gray-500 font-mono tracking-wider block mb-3 uppercase">Incident Dispatch Stepper</span>
                        
                        <div className="relative pl-6 border-l border-gray-800 flex flex-col gap-5 text-xs">
                          {/* Step 1: Citizen Filed */}
                          <div className="relative">
                            <span className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border border-cyan-500 bg-cyan-950 flex items-center justify-center text-[8px] text-cyan-400 font-bold">1</span>
                            <div>
                              <div className="flex justify-between font-bold text-gray-200">
                                <span>Citizen Filed Report</span>
                                <span className="text-[9px] font-mono text-gray-500">
                                  {new Date(selectedComplaint.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">Ingested successfully. Citizen ID: {selectedComplaint.citizenPhone.slice(-4)}</p>
                            </div>
                          </div>

                          {/* Step 2: AI Classified */}
                          <div className="relative">
                            <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                              routingStep >= 2
                                ? "border-cyan-500 bg-cyan-950 text-cyan-400"
                                : "border-gray-800 bg-gray-950 text-gray-600"
                            }`}>2</span>
                            <div className={routingStep >= 2 ? "text-gray-200" : "text-gray-600"}>
                              <div className="flex justify-between font-bold">
                                <span>AI Audit & Classification</span>
                                {routingStep >= 2 && (
                                  <span className="text-[9px] font-mono text-gray-500">
                                    +10m
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {routingStep >= 2 
                                  ? `Classified as ${selectedComplaint.category.toUpperCase()} (98% confidence)` 
                                  : "Awaiting automatic audit evaluation..."}
                              </p>
                            </div>
                          </div>

                          {/* Step 3: Routed to Dept */}
                          <div className="relative">
                            <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                              routingStep >= 3
                                ? "border-cyan-500 bg-cyan-950 text-cyan-400"
                                : "border-gray-800 bg-gray-950 text-gray-600"
                            }`}>3</span>
                            <div className={routingStep >= 3 ? "text-gray-200" : "text-gray-600"}>
                              <div className="flex justify-between font-bold">
                                <span>Routed to Department</span>
                                {routingStep >= 3 && (
                                  <span className="text-[9px] font-mono text-gray-500">
                                    +10m
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {routingStep >= 3 
                                  ? `Dispatched to ${selectedComplaint.assignedDept}` 
                                  : "Pending automatic routing dispatch..."}
                              </p>
                            </div>
                          </div>

                          {/* Step 4: Department Acknowledged */}
                          <div className="relative">
                            <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                              selectedComplaint.status === "in_progress" || selectedComplaint.status === "resolved"
                                ? "border-cyan-500 bg-cyan-950 text-cyan-400"
                                : "border-gray-800 bg-gray-950 text-gray-600"
                            }`}>4</span>
                            <div className={(selectedComplaint.status === "in_progress" || selectedComplaint.status === "resolved") ? "text-gray-200" : "text-gray-600"}>
                              <div className="flex justify-between font-bold">
                                <span>Department Acknowledged</span>
                                {(selectedComplaint.status === "in_progress" || selectedComplaint.status === "resolved") && (
                                  <span className="text-[9px] font-mono text-gray-500">
                                    +2h
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {(selectedComplaint.status === "in_progress" || selectedComplaint.status === "resolved") 
                                  ? "Assigned to ward supervisor & field team." 
                                  : "Awaiting department confirmation..."}
                              </p>
                            </div>
                          </div>

                          {/* Step 5: Resolution */}
                          <div className="relative">
                            <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                              selectedComplaint.status === "resolved"
                                ? "border-emerald-500 bg-emerald-950 text-emerald-400"
                                : "border-gray-800 bg-gray-950 text-gray-600"
                            }`}>5</span>
                            <div className={selectedComplaint.status === "resolved" ? "text-gray-200" : "text-gray-600"}>
                              <div className="flex justify-between font-bold">
                                <span>Resolution Confirmed</span>
                                {selectedComplaint.status === "resolved" && (
                                  <span className="text-[9px] font-mono text-emerald-400">
                                    Closed
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {selectedComplaint.status === "resolved" 
                                  ? "Problem resolved. Proof verification complete." 
                                  : "Awaiting field team operations completion..."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Tab 2: Actions Log & Submission Form */
                    <div className="flex-grow flex flex-col justify-between overflow-y-auto max-h-[420px] pr-1 scrollbar-thin">
                      
                      {/* Chronological Log */}
                      <div className="flex-grow flex flex-col gap-3.5 mb-6">
                        <span className="text-[10px] text-gray-500 font-mono tracking-wider block uppercase border-b border-gray-950 pb-1.5">Timeline Log</span>
                        
                        {actionsLoading ? (
                          <div className="py-8 text-center text-xs text-gray-500 flex flex-col gap-1.5 items-center justify-center">
                            <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
                            <span>Loading action log history...</span>
                          </div>
                        ) : actionLogs.length > 0 ? (
                          <div className="flex flex-col gap-3">
                            {actionLogs.map((log, idx) => (
                              <motion.div
                                key={log.id}
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                className="bg-gray-950/40 border border-gray-950 rounded-xl p-3 text-xs"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-gray-200 font-mono text-[10px] flex items-center gap-1.5">
                                    {log.actionType === "Status change" && <Activity className="w-3.5 h-3.5 text-cyan-400" />}
                                    {log.actionType === "Field visit logged" && <MapPin className="w-3.5 h-3.5 text-blue-400" />}
                                    {log.actionType === "Mark resolved" && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                                    {log.actionType === "Note" && <FileText className="w-3.5 h-3.5 text-purple-400" />}
                                    {log.actionType}
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-mono">
                                    {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <p className="text-gray-300 text-[11px] leading-normal">{log.notes}</p>
                                <div className="mt-2 text-[9px] text-gray-500 font-mono text-right">
                                  Logged by: <strong className="text-cyan-500">{log.officialName}</strong>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 text-center text-xs text-gray-500">
                            No action updates have been recorded for this ticket yet.
                          </div>
                        )}
                      </div>

                      {/* Add Action Update Form */}
                      <form onSubmit={handleAddAction} className="bg-gray-950/80 border border-gray-950 rounded-xl p-4 flex flex-col gap-3 relative shadow-inner">
                        <span className="text-[10px] text-gray-400 font-mono tracking-wider block uppercase">Submit Action Update</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] text-gray-500 font-mono uppercase">Action Type</label>
                            <select
                              value={newActionType}
                              onChange={(e) => setNewActionType(e.target.value)}
                              className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                            >
                              <option value="Note">General Note</option>
                              <option value="Field visit logged">Log Field Visit</option>
                              <option value="Status change">Change Status</option>
                              <option value="Mark resolved">Mark Resolved</option>
                            </select>
                          </div>
                          
                          {newActionType === "Status change" && (
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] text-gray-500 font-mono uppercase">New Status</label>
                              <select
                                value={newActionStatus}
                                onChange={(e) => setNewActionStatus(e.target.value)}
                                className="bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                              >
                                <option value="pending">Pending</option>
                                <option value="routed">Routed</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                              </select>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-500 font-mono uppercase">Operational Notes</label>
                          <textarea
                            value={newActionNotes}
                            onChange={(e) => setNewActionNotes(e.target.value)}
                            placeholder="Detail actions taken, inspection observations, or resolution description..."
                            rows={3}
                            className="bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white placeholder-gray-600 focus:border-cyan-500 focus:outline-none resize-none"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[9px] text-gray-500 font-mono uppercase">Evidence Photo URL (Optional)</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={newActionPhotoUrl}
                              onChange={(e) => setNewActionPhotoUrl(e.target.value)}
                              placeholder="e.g. /images/evidence_repaired.jpg"
                              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none placeholder-gray-600"
                            />
                            <Camera className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-500" />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmittingAction || !newActionNotes.trim()}
                          className="bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-gray-950 font-bold py-2 rounded-lg text-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-1.5 mt-1"
                        >
                          {isSubmittingAction ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-950" />
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 text-gray-950" />
                              Log Action Entry
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-600 gap-2">
                  <Info className="w-8 h-8 text-gray-700" />
                  <span>Select any ticket from the database table to audit details and simulate the automated dispatch path.</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Ward Report Modal Overlay */}
      <AnimatePresence>
        {isReportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setIsReportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-cyan-500/0 via-cyan-500/50 to-indigo-500/0" />

              {/* Modal Header */}
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950/20">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                    Ward Operations Executive Summary
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Focus Area: {selectedWard}</p>
                </div>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="text-gray-500 hover:text-white border border-gray-800 hover:border-gray-700 bg-gray-950 p-2 rounded-xl text-xs transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Scroll Content */}
              <div className="p-6 overflow-y-auto flex-grow flex flex-col gap-6 scrollbar-thin">
                {isGeneratingReport ? (
                  <div className="flex-grow py-16 flex flex-col items-center justify-center gap-4 text-center text-gray-400">
                    <div className="w-12 h-12 rounded-full border-2 border-cyan-500/25 border-t-cyan-500 animate-spin" />
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-sm text-white">Synthesizing Executive Ward Telemetry...</span>
                      <span className="text-xs text-gray-500 max-w-[320px]">Analyzing local category loads, computing ward density levels, and generating recommendations.</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Stats Cards Row */}
                    {generatedReportStats && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 flex flex-col">
                          <span className="text-[9px] text-gray-500 font-mono">TOTAL INCIDENTS</span>
                          <span className="text-xl font-black text-white mt-1">{generatedReportStats.total}</span>
                        </div>
                        <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 flex flex-col">
                          <span className="text-[9px] text-gray-500 font-mono">PENDING DISPATCH</span>
                          <span className="text-xl font-black text-yellow-450 mt-1">{generatedReportStats.pending}</span>
                        </div>
                        <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 flex flex-col">
                          <span className="text-[9px] text-gray-500 font-mono">IN PROGRESS</span>
                          <span className="text-xl font-black text-cyan-400 mt-1">{generatedReportStats.inProgress}</span>
                        </div>
                        <div className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 flex flex-col">
                          <span className="text-[9px] text-gray-500 font-mono">RESOLVED/CLOSED</span>
                          <span className="text-xl font-black text-emerald-400 mt-1">{generatedReportStats.resolved}</span>
                        </div>
                      </div>
                    )}

                    {/* Report Document Markdown Text */}
                    <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 font-sans text-xs text-gray-300 leading-relaxed whitespace-pre-line shadow-inner max-h-[380px] overflow-y-auto scrollbar-thin border-l-4 border-l-cyan-500/40">
                      {generatedReportText}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              {!isGeneratingReport && (
                <div className="p-4 border-t border-gray-800 flex flex-wrap justify-between items-center gap-3 bg-gray-950/20">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadReport(selectedWard)}
                      className="bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-cyan-500/20 text-cyan-400 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Report (.txt)
                    </button>
                    <button
                      onClick={() => handleExportCSV(selectedWard)}
                      className="bg-gray-950 hover:bg-gray-900 border border-gray-800 hover:border-cyan-500/20 text-cyan-400 text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Ward Tickets (.csv)
                    </button>
                  </div>
                  <button
                    onClick={() => setIsReportModalOpen(false)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 text-xs font-bold px-5 py-2 rounded-xl transition-colors"
                  >
                    Close Report
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
