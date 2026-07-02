"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Camera, MapPin, User, Phone, CheckCircle, 
  ArrowLeft, ArrowRight, Trash2, Shield, Trash, Droplets,
  HardHat, Zap, AlertTriangle, AlertCircle, RefreshCw
} from "lucide-react";

const steps = [
  { id: 1, name: "Category" },
  { id: 2, name: "Details & Photo" },
  { id: 3, name: "AI Audit" },
  { id: 4, name: "Location & Submit" }
];

const categories = ["waste", "water", "road", "electricity", "safety"];

const categoryConfig = [
  { id: "waste", name: "Waste Management", icon: Trash, color: "from-emerald-500 to-teal-600", desc: "Overflowing bins, litter, illegal dumping" },
  { id: "water", name: "Water & Sewage", icon: Droplets, color: "from-blue-500 to-cyan-600", desc: "Pipe leaks, sewage overflow, water quality" },
  { id: "road", name: "Roads & Footpaths", icon: HardHat, color: "from-amber-500 to-orange-600", desc: "Potholes, broken paving, unsafe sidewalks" },
  { id: "electricity", name: "Power & Lighting", icon: Zap, color: "from-yellow-400 to-amber-600", desc: "Streetlight outages, exposed wires, sparking" },
  { id: "safety", name: "Public Safety", icon: Shield, color: "from-red-500 to-rose-600", desc: "Stray dogs, dark spots, traffic signals, hazards" }
];

const wards = ["Ward 1", "Ward 2", "Ward 3", "Ward 4", "Ward 5"];

export default function ReportPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0); // -1 for back, 1 for forward

  // Form State
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageBase64, setImageBase64] = useState<string>("");
  const [imageMimeType, setImageMimeType] = useState<string>("");

  // AI Classification State (Step 3)
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiTitle, setAiTitle] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [aiUrgency, setAiUrgency] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiDept, setAiDept] = useState("");

  // Location & Contact State (Step 4)
  const [ward, setWard] = useState("Ward 1");
  const [address, setAddress] = useState("");
  const [citizenName, setCitizenName] = useState("");
  const [citizenPhone, setCitizenPhone] = useState("");

  // Post Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImageMimeType(file.type);
    
    // Create local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      // Strip metadata from dataURI for Gemini API
      const base64 = result.split(",")[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageBase64("");
    setImageMimeType("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Run AI analysis
  const runAiAnalysis = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await fetch("/api/reports/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          image: imageBase64 || undefined,
          mimeType: imageMimeType || undefined
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "Analysis failed");
      }

      const { title, category: autoCat, urgency: autoUrg, descriptionSummary, assignedDept } = resData.data;
      setAiTitle(title);
      setAiCategory(autoCat);
      setAiUrgency(autoUrg);
      setAiSummary(descriptionSummary);
      setAiDept(assignedDept);
      
      // Auto-set the category to what AI suggested if citizen hasn't locked it in
      if (!category) {
        setCategory(autoCat);
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Failed to analyze your report. Please review details manually.");
      // Set defaults for editing
      setAiTitle(description.slice(0, 30));
      setAiCategory(category || "road");
      setAiUrgency("medium");
      setAiSummary(description);
      setAiDept("Public Works Department (PWD)");
    } finally {
      setAiLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!category) return; // Must select category
      goToStep(2);
    } else if (currentStep === 2) {
      if (!description.trim()) return; // Must write description
      // Trigger AI Analysis and move to step 3
      goToStep(3);
      runAiAnalysis();
    } else if (currentStep === 3) {
      goToStep(4);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  };

  // Handle Swipe Gesture
  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 100;
    if (info.offset.x < -swipeThreshold) {
      // Swiped Left -> Next
      if (currentStep === 1 && category) handleNextStep();
      if (currentStep === 2 && description.trim()) handleNextStep();
      if (currentStep === 3) handleNextStep();
    } else if (info.offset.x > swipeThreshold) {
      // Swiped Right -> Back
      handleBackStep();
    }
  };

  // Submit Complaint
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenName || !citizenPhone) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reports/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: aiTitle,
          description: description,
          category: aiCategory,
          urgency: aiUrgency,
          ward: ward,
          imageUrl: imagePreview || undefined,
          citizenName,
          citizenPhone
        })
      });

      const resData = await response.json();
      if (!resData.success) {
        throw new Error(resData.error || "Submission failed");
      }

      setSubmitSuccess(true);
      // Wait 3 seconds then redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 3500);
    } catch (err: any) {
      alert("Error submitting: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Variants for step transition
  const transitionVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0
    })
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-950/15 blur-[120px] pointer-events-none" />

      {/* Back to Home Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 text-gray-400 hover:text-white flex items-center gap-2 text-sm font-medium z-30 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="w-full max-w-xl relative z-10">
        {/* Title */}
        <div className="text-center mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-teal-300 bg-clip-text text-transparent">
            Submit a Civic Report
          </h1>
          <p className="text-gray-400 text-sm">
            Fill in the details. Nagar AI will classify and route it to correct department.
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, index) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-initial">
              <button
                onClick={() => {
                  // Only allow jumping back, or jumping forward if step is validated
                  if (s.id < currentStep) goToStep(s.id);
                }}
                disabled={s.id >= currentStep}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs transition-all ${
                  currentStep === s.id
                    ? "bg-cyan-500 text-gray-950 ring-4 ring-cyan-500/20"
                    : s.id < currentStep
                    ? "bg-cyan-950/80 border border-cyan-500/40 text-cyan-400"
                    : "bg-gray-900 border border-gray-800 text-gray-500 cursor-not-allowed"
                }`}
              >
                {s.id}
              </button>
              {index < steps.length - 1 && (
                <div
                  className={`h-[2px] flex-1 mx-2 transition-all ${
                    s.id < currentStep ? "bg-cyan-500/40" : "bg-gray-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Swipe Help Note */}
        <div className="text-center text-[10px] text-gray-500 mb-2 select-none pointer-events-none hidden md:block">
          Swipe left/right on form to navigate
        </div>

        {/* Dynamic Form Step Card */}
        <div className="bg-gray-900/50 border border-gray-800/80 rounded-2xl shadow-2xl backdrop-blur-xl relative overflow-hidden min-h-[420px] flex flex-col">
          
          {/* Main Success Screen */}
          <AnimatePresence mode="wait">
            {submitSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 flex flex-col items-center justify-center flex-1 text-center"
              >
                <div className="relative w-20 h-20 mb-6">
                  {/* Glowing Pulse Rings */}
                  <div className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-cyan-500/10 animate-pulse" />
                  <div className="absolute inset-4 rounded-full bg-cyan-950 border border-cyan-500/30 flex items-center justify-center z-10">
                    <CheckCircle className="w-10 h-10 text-cyan-400" />
                  </div>
                </div>

                <h2 className="text-2xl font-bold mb-2">Report Filed Successfully</h2>
                <p className="text-gray-400 text-sm max-w-sm mb-6">
                  Your ticket has been ingested, embedded into vector telemetry, and routed.
                </p>

                {/* Simulated routing flow animation */}
                <div className="w-full bg-gray-950 border border-cyan-950/30 rounded-xl p-4 text-left font-mono text-xs text-cyan-400 flex flex-col gap-1.5 shadow-inner">
                  <div className="flex justify-between border-b border-cyan-950/40 pb-1 mb-1">
                    <span>TRANSMISSION Telemetry</span>
                    <span className="animate-pulse">● SECURE</span>
                  </div>
                  <div>ID: {aiTitle.substring(0, 8).toUpperCase()}-TICKET</div>
                  <div className="flex items-center gap-1.5">
                    <span>Ward:</span>
                    <span className="text-white">{ward}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Urgency:</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                      aiUrgency === "critical" ? "bg-red-950/80 text-red-400 border border-red-500/30" :
                      aiUrgency === "high" ? "bg-amber-950/80 text-amber-400 border border-amber-500/30" :
                      aiUrgency === "medium" ? "bg-blue-950/80 text-blue-400 border border-blue-500/30" :
                      "bg-gray-800 text-gray-300"
                    }`}>{aiUrgency}</span>
                  </div>
                  <div className="text-[11px] text-teal-400 mt-1.5 flex items-center gap-2 border-t border-cyan-950/40 pt-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping flex-shrink-0" />
                    <span>Routing to: <strong className="text-white">{aiDept}</strong></span>
                  </div>
                </div>

                <div className="text-xs text-gray-500 mt-6 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                  <span>Redirecting to Official Console...</span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentStep}
                custom={direction}
                variants={transitionVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.4}
                onDragEnd={handleDragEnd}
                className="p-6 flex-1 flex flex-col justify-between"
              >
                {/* STEP 1: CATEGORY SELECTION */}
                {currentStep === 1 && (
                  <div className="flex flex-col flex-1">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="text-cyan-400">Step 1:</span> Choose Category
                    </h3>
                    <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-1 max-h-[300px] scrollbar-thin">
                      {categoryConfig.map((cat) => {
                        const IconComponent = cat.icon;
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`p-4 rounded-xl flex items-center gap-4 text-left border transition-all hover:scale-[1.01] active:scale-[0.99] ${
                              isSelected
                                ? "bg-gray-800/80 border-cyan-500 shadow-lg shadow-cyan-500/5"
                                : "bg-gray-950/40 border-gray-800 hover:border-gray-700"
                            }`}
                          >
                            <div className={`w-11 h-11 rounded-lg bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white flex-shrink-0 shadow`}>
                              <IconComponent className="w-5.5 h-5.5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm">{cat.name}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2: DETAILS & PHOTO */}
                {currentStep === 2 && (
                  <div className="flex flex-col flex-1">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="text-cyan-400">Step 2:</span> Describe the Issue
                    </h3>
                    <div className="flex flex-col gap-4 flex-1">
                      {/* Description Input */}
                      <div>
                        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                          What is the issue? Describe clearly.
                        </label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Example: The pipe outside public school is leaking water rapidly, flooding the pavement..."
                          className="w-full h-24 bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm focus:border-cyan-500 focus:outline-none resize-none transition-colors"
                          required
                        />
                      </div>

                      {/* Photo Intake */}
                      <div className="flex-1 flex flex-col justify-end">
                        <label className="text-xs font-semibold text-gray-400 mb-1.5 block">
                          Attach Photo (Optional)
                        </label>
                        
                        {imagePreview ? (
                          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-800 bg-gray-950 flex items-center justify-center">
                            <img
                              src={imagePreview}
                              alt="Complaint attachment"
                              className="max-w-full max-h-full object-contain"
                            />
                            <button
                              type="button"
                              onClick={removeImage}
                              className="absolute top-2.5 right-2.5 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-lg transition-colors shadow"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-32 rounded-xl border border-dashed border-gray-800 hover:border-cyan-500/50 bg-gray-950/40 hover:bg-cyan-950/5 flex flex-col items-center justify-center gap-2.5 transition-all"
                          >
                            <div className="w-10 h-10 rounded-full bg-cyan-950/60 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shadow-inner">
                              <Camera className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-gray-400">Click to upload photo</span>
                            <span className="text-[10px] text-gray-500">Supports PNG, JPG</span>
                          </button>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: AI AUDIT */}
                {currentStep === 3 && (
                  <div className="flex flex-col flex-1">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="text-cyan-400">Step 3:</span> AI Classification Audit
                    </h3>

                    {aiLoading ? (
                      /* SKELETON SCREEN WITH SHIMMER */
                      <div className="flex flex-col gap-4 flex-1 animate-pulse">
                        <div className="h-6 bg-gray-800 rounded w-1/3 mb-2 overflow-hidden relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/20 to-transparent w-full h-full -translate-x-full animate-shimmer" style={{ animation: 'shimmer 1.5s infinite' }} />
                        </div>
                        <div className="space-y-2">
                          <div className="h-9 bg-gray-800 rounded w-full" />
                          <div className="h-16 bg-gray-800 rounded w-full" />
                          <div className="h-9 bg-gray-800 rounded w-full" />
                        </div>
                        <div className="h-10 bg-gray-800 rounded w-1/2 mt-auto" />
                      </div>
                    ) : aiError ? (
                      <div className="flex flex-col items-center justify-center gap-3 text-center flex-1 text-amber-200">
                        <AlertCircle className="w-10 h-10 text-amber-500" />
                        <h4 className="font-bold">AI Processing Error</h4>
                        <p className="text-xs text-gray-400 max-w-xs">{aiError}</p>
                        <button
                          type="button"
                          onClick={runAiAnalysis}
                          className="mt-2 text-xs flex items-center gap-1.5 bg-gray-900 border border-gray-800 hover:border-cyan-500/40 text-cyan-400 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Retry Audit
                        </button>
                      </div>
                    ) : (
                      /* COMPLETED AI CLASSIFICATION */
                      <div className="flex flex-col gap-4 flex-1 overflow-y-auto pr-1 max-h-[300px] scrollbar-thin">
                        <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-xl p-3.5 flex items-start gap-2.5 shadow-inner">
                          <Sparkles className="w-5 h-5 text-cyan-400 flex-shrink-0 animate-pulse mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs text-cyan-400">Gemini Audit Completed</h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">We categorized and generated a summary. You can adjust the parameters if incorrect.</p>
                          </div>
                        </div>

                        {/* Summary / Title Input */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Generated Title</label>
                          <input
                            type="text"
                            value={aiTitle}
                            onChange={(e) => setAiTitle(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* Category & Urgency side by side */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Category</label>
                            <select
                              value={aiCategory}
                              onChange={(e) => setAiCategory(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors font-medium capitalize"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c} className="bg-gray-950 text-white capitalize">{c}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Urgency</label>
                            <select
                              value={aiUrgency}
                              onChange={(e) => setAiUrgency(e.target.value)}
                              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors font-medium capitalize"
                            >
                              <option value="low" className="text-gray-400">Low</option>
                              <option value="medium" className="text-blue-400">Medium</option>
                              <option value="high" className="text-amber-400 font-bold">High</option>
                              <option value="critical" className="text-red-400 font-black">Critical</option>
                            </select>
                          </div>
                        </div>

                        {/* Routed Department */}
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Routed Department</label>
                          <input
                            type="text"
                            value={aiDept}
                            onChange={(e) => setAiDept(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 focus:border-cyan-500 focus:outline-none transition-colors"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: LOCATION & CONTACT */}
                {currentStep === 4 && (
                  <div className="flex flex-col flex-1">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="text-cyan-400">Step 4:</span> Contact & Location
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 flex-1 overflow-y-auto pr-1 max-h-[300px] scrollbar-thin">
                      {/* Ward Selection */}
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Municipal Ward</label>
                        <select
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                        >
                          {wards.map((w) => (
                            <option key={w} value={w}>{w}</option>
                          ))}
                        </select>
                      </div>

                      {/* Physical Address */}
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Address / Location Details</label>
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. 5th Main Rd, opposite Central Library"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                          required
                        />
                      </div>

                      {/* Contact Info (Side by side) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Your Name</label>
                          <input
                            type="text"
                            value={citizenName}
                            onChange={(e) => setCitizenName(e.target.value)}
                            placeholder="e.g. Amit"
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-400 mb-1 block">Phone Number</label>
                          <input
                            type="tel"
                            value={citizenPhone}
                            onChange={(e) => setCitizenPhone(e.target.value)}
                            placeholder="e.g. +91 99..."
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs focus:border-cyan-500 focus:outline-none transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="hidden" id="hidden-submit-btn" />
                    </form>
                  </div>
                )}

                {/* Bottom Navigation Buttons */}
                <div className="flex justify-between border-t border-gray-800/80 pt-4 mt-4 relative z-10">
                  <button
                    type="button"
                    onClick={handleBackStep}
                    disabled={currentStep === 1}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${
                      currentStep === 1
                        ? "text-gray-600 cursor-not-allowed opacity-50"
                        : "text-gray-300 hover:text-white bg-gray-950 border border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={handleNextStep}
                      disabled={
                        (currentStep === 1 && !category) ||
                        (currentStep === 2 && !description.trim()) ||
                        (currentStep === 3 && aiLoading)
                      }
                      className="flex items-center gap-1.5 text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-950/40 text-gray-950 disabled:text-cyan-500/50 disabled:border disabled:border-cyan-500/20 px-5 py-2.5 rounded-lg shadow-lg hover:shadow-cyan-500/10 disabled:shadow-none transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {currentStep === 2 ? "Analyze" : "Next"} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => document.getElementById("hidden-submit-btn")?.click()}
                      disabled={isSubmitting || !citizenName || !citizenPhone || !address}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 disabled:from-gray-950 disabled:to-gray-950 disabled:text-gray-600 disabled:border disabled:border-gray-800 text-gray-950 px-5 py-2.5 rounded-lg shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          File Report <CheckCircle className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
