import React, { useState } from "react";
import { Job, UserProfile } from "../types";
import { Bot, Sparkles, Copy, Check, Send, AlertCircle, RefreshCw } from "lucide-react";

interface AIPitchBuilderProps {
  job: Job;
  userProfile: UserProfile;
  onApplyWithPitch: (pitch: string) => void;
  isApplied: boolean;
}

const LOADING_STEPS = [
  "Analyzing job requirements...",
  "Scanning your student profile & skills...",
  "Highlighting academic adaptability...",
  "Emphasizing customer-first reliability...",
  "Polishing energetic student tone...",
  "Drafting final tailored pitch with Gemini..."
];

export default function AIPitchBuilder({ job, userProfile, onApplyWithPitch, isApplied }: AIPitchBuilderProps) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [pitch, setPitch] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [manualPitch, setManualPitch] = useState("");

  // Trigger Gemini API via Express backend
  const generateAIPitch = async () => {
    setLoading(true);
    setError(null);
    setPitch("");

    // Cycle through loading messages for an engaging high-fidelity feel
    let step = 0;
    const interval = setInterval(() => {
      if (step < LOADING_STEPS.length - 1) {
        step++;
        setLoadingStep(step);
      }
    }, 1200);

    try {
      // Package custom message or notes if user specified them
      const enrichedProfile = {
        ...userProfile,
        bio: customPrompt 
          ? `${userProfile.bio} (Special instruction from student: ${customPrompt})`
          : userProfile.bio
      };

      const response = await fetch("/api/ai/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: job.title,
          jobCompany: job.employer,
          jobDescription: job.description,
          userProfile: enrichedProfile
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to contact backend AI service.");
      }

      const data = await response.json();
      setPitch(data.pitch || "No pitch was generated.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Ensure you have set your GEMINI_API_KEY in the secrets menu.");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setLoadingStep(0);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = mode === "ai" ? pitch : manualPitch;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-indigo-50/30 rounded-[1.5rem] border-2 border-indigo-200 p-5 mt-5 shadow-sm" id="ai-pitch-assistant-card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <h4 className="font-display font-black text-indigo-900 text-sm sm:text-base flex items-center gap-1.5">
              Gig-Pitch Builder
              <span className="bg-indigo-600 text-white text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-black tracking-wider">OPTIONAL AI</span>
            </h4>
            <p className="text-xs font-medium text-slate-600">Draft your own pitch or let Gemini design a custom pitch for you</p>
          </div>
        </div>
      </div>

      {isApplied ? (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
          <Check className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
          <h5 className="font-semibold text-emerald-900 text-sm">Application Sent!</h5>
          <p className="text-xs text-emerald-700 mt-0.5">
            You've applied to this job. The employer has been notified with your resume and cover letter.
          </p>
        </div>
      ) : (
        <>
          {/* Mode Switcher */}
          <div className="flex border-2 border-indigo-950 bg-white rounded-xl p-1 mb-4 max-w-xs">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                mode === "ai"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-indigo-950"
              }`}
            >
              🤖 AI Draft
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`flex-1 text-center py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                mode === "manual"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-indigo-950"
              }`}
            >
              ✏️ Write My Own
            </button>
          </div>

          {mode === "ai" ? (
            loading ? (
              <div className="bg-white border border-slate-200/60 rounded-xl p-6 text-center shadow-sm flex flex-col items-center justify-center min-h-[160px]">
                <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
                <p className="text-sm font-semibold text-slate-700 animate-pulse">
                  {LOADING_STEPS[loadingStep]}
                </p>
                <p className="text-xs text-slate-400 mt-1">Connecting server-side with Gemini API</p>
              </div>
            ) : error ? (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3 text-xs text-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <div className="flex-1">
                  <span className="font-bold">AI Helper Service Error:</span>
                  <p className="mt-1 text-rose-700">{error}</p>
                  <button
                    onClick={generateAIPitch}
                    className="mt-3 bg-white hover:bg-rose-100 border border-rose-200 font-semibold px-2.5 py-1 rounded-lg text-rose-700 cursor-pointer"
                  >
                    Retry Generation
                  </button>
                </div>
              </div>
            ) : pitch ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase text-indigo-950 tracking-wide">Gemini Proposal Draft (Editable)</span>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-950 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Draft</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-white border-2 border-indigo-950 rounded-[1.25rem] shadow-inner p-4 relative">
                  <textarea
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    rows={8}
                    className="w-full text-xs text-slate-700 font-sans leading-relaxed resize-y focus:outline-none bg-transparent border-none pr-8"
                    placeholder="AI generated pitch will appear here. You can customize it before sending."
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => onApplyWithPitch(pitch)}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-indigo-950 border-2 border-indigo-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Apply with This AI Pitch
                  </button>
                  <button
                    type="button"
                    onClick={generateAIPitch}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border-2 border-indigo-950 font-black text-xs px-3.5 py-2.5 rounded-xl shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-indigo-200 rounded-[1.25rem] p-5 text-center">
                <p className="text-xs text-slate-500 leading-relaxed mb-3.5">
                  Add custom notes below (e.g. "I can start immediately", "I own an electric scooter", "I am a sophomore") to tailor your pitch, then click generate.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g. Explain that I am free to start this Saturday..."
                    className="flex-1 text-xs px-3.5 py-2.5 bg-indigo-50/50 border-2 border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white text-indigo-950 placeholder-slate-400 font-medium"
                  />
                  <button
                    type="button"
                    onClick={generateAIPitch}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all border-2 border-indigo-950 shadow-[0_2.5px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none cursor-pointer shrink-0"
                  >
                    Generate Pitch
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black uppercase text-indigo-950 tracking-wide">Write Your Cover Pitch / Message</span>
                <button
                  type="button"
                  onClick={copyToClipboard}
                  disabled={!manualPitch.trim()}
                  className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-950 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy My Pitch</span>
                    </>
                  )}
                </button>
              </div>
              <div className="bg-white border-2 border-indigo-950 rounded-[1.25rem] shadow-inner p-4 relative">
                <textarea
                  value={manualPitch}
                  onChange={(e) => setManualPitch(e.target.value)}
                  rows={8}
                  placeholder={`Hi ${job.employer} team,\n\nI am writing to apply for the ${job.title} gig. I'm a student at university and I believe my background matches this position perfectly. Here are a few details about my availability and skills:\n\n- Availability:\n- Why I am a great fit:\n\nI look forward to hearing from you!\n\nBest,`}
                  className="w-full text-xs text-indigo-950 font-sans leading-relaxed resize-y focus:outline-none bg-transparent border-none"
                />
              </div>

              <button
                type="button"
                onClick={() => onApplyWithPitch(manualPitch)}
                disabled={!manualPitch.trim()}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-indigo-950 border-2 border-indigo-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                Apply with My Pitch
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
