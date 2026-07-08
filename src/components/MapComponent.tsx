import React, { useRef, useState } from "react";
import { Job, JobCategory } from "../types";
import { MapPin, Navigation, ZoomIn, ZoomOut, Compass } from "lucide-react";

interface MapComponentProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (id: string) => void;
  userCoords: { x: number; y: number };
  onUpdateUserCoords: (coords: { x: number; y: number }) => void;
}

// Map colors for categories
export const categoryColors: Record<JobCategory, { bg: string; text: string; hex: string; border: string }> = {
  [JobCategory.CATERING_EVENTS]: { bg: "bg-emerald-50", text: "text-emerald-700", hex: "#10b981", border: "border-emerald-200" },
  [JobCategory.DELIVERY]: { bg: "bg-orange-50", text: "text-orange-700", hex: "#f97316", border: "border-orange-200" },
  [JobCategory.CAMPUS_ASSISTANT]: { bg: "bg-sky-50", text: "text-sky-700", hex: "#0ea5e9", border: "border-sky-200" },
  [JobCategory.HOME_HELPER]: { bg: "bg-amber-50", text: "text-amber-700", hex: "#f59e0b", border: "border-amber-200" },
  [JobCategory.RETAIL_CASHIER]: { bg: "bg-rose-50", text: "text-rose-700", hex: "#f43f5e", border: "border-rose-200" },
  [JobCategory.TUTORING]: { bg: "bg-indigo-50", text: "text-indigo-700", hex: "#6366f1", border: "border-indigo-200" },
  [JobCategory.OTHER]: { bg: "bg-slate-50", text: "text-slate-700", hex: "#64748b", border: "border-slate-200" }
};

export default function MapComponent({
  jobs,
  selectedJobId,
  onSelectJob,
  userCoords,
  onUpdateUserCoords
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredJob, setHoveredJob] = useState<Job | null>(null);

  // Handle map clicks to set new user location
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!mapContainerRef.current) return;
    
    // Prevent clicking map elements/pins from resetting position
    const target = e.target as HTMLElement;
    if (target.closest(".job-pin") || target.closest(".user-pin")) {
      return;
    }

    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel click to 0-100 percentage values
    const pctX = Math.round((clickX / rect.width) * 100);
    const pctY = Math.round((clickY / rect.height) * 100);

    // Keep within bounds
    const clampedX = Math.max(5, Math.min(95, pctX));
    const clampedY = Math.max(5, Math.min(95, pctY));

    onUpdateUserCoords({ x: clampedX, y: clampedY });
  };

  // Helper to calculate pixel position for grid values
  const getPositionStyle = (x: number, y: number) => {
    return {
      left: `${x}%`,
      top: `${y}%`,
      transform: "translate(-50%, -50%)"
    };
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-[2rem] border-4 border-indigo-900 shadow-xl overflow-hidden" id="interactive-map-card">
      {/* Map Header */}
      <div className="p-5 border-b-4 border-indigo-900 bg-indigo-50/60 flex flex-wrap justify-between items-center gap-2">
        <div>
          <h3 className="font-display font-black text-indigo-900 text-base sm:text-lg flex items-center gap-1.5">
            <Compass className="w-5 h-5 text-indigo-600 animate-pulse" />
            Interactive Gig Map
          </h3>
          <p className="text-xs font-medium text-indigo-950/70">
            Click anywhere on the grid to change your starting location
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border-2 border-indigo-900 rounded-xl text-indigo-900 font-bold shadow-sm">
            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-ping" />
            My Location: {userCoords.x}, {userCoords.y}
          </span>
        </div>
      </div>

      {/* Map Visual Stage */}
      <div 
        ref={mapContainerRef}
        onClick={handleMapClick}
        className="relative flex-1 bg-slate-50 cursor-crosshair overflow-hidden select-none"
        style={{ minHeight: "380px" }}
      >
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />

        {/* Dynamic Distance Circles centered on User */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <circle 
            cx={`${userCoords.x}%`} 
            cy={`${userCoords.y}%`} 
            r="80" 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="1" 
            strokeDasharray="4 4" 
            className="opacity-25" 
          />
          <text 
            x={`${userCoords.x}%`} 
            y={`${userCoords.y}%`} 
            dy="-85" 
            textAnchor="middle" 
            className="fill-indigo-400 font-mono text-[10px] opacity-60"
          >
            0.5 mi
          </text>

          <circle 
            cx={`${userCoords.x}%`} 
            cy={`${userCoords.y}%`} 
            r="160" 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="1" 
            strokeDasharray="4 4" 
            className="opacity-15" 
          />
          <text 
            x={`${userCoords.x}%`} 
            y={`${userCoords.y}%`} 
            dy="-165" 
            textAnchor="middle" 
            className="fill-indigo-400 font-mono text-[10px] opacity-40"
          >
            1.5 mi
          </text>

          <circle 
            cx={`${userCoords.x}%`} 
            cy={`${userCoords.y}%`} 
            r="260" 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="0.75" 
            className="opacity-10" 
          />
          <text 
            x={`${userCoords.x}%`} 
            y={`${userCoords.y}%`} 
            dy="-265" 
            textAnchor="middle" 
            className="fill-indigo-400 font-mono text-[10px] opacity-30"
          >
            3.0 mi
          </text>
        </svg>

        {/* Map landmarks / labels */}
        <div className="absolute top-8 left-8 text-[11px] font-semibold text-slate-400/80 uppercase tracking-widest pointer-events-none">
          North District
        </div>
        <div className="absolute bottom-8 right-8 text-[11px] font-semibold text-slate-400/80 uppercase tracking-widest pointer-events-none">
          Downtown Business Zone
        </div>
        <div className="absolute top-12 right-12 text-[11px] font-semibold text-slate-400/80 uppercase tracking-widest pointer-events-none">
          West Hills Park
        </div>

        {/* Seeker / User Pin (Draggable/Clickable center) */}
        <div 
          className="user-pin absolute cursor-grab z-20 group transition-all duration-300"
          style={getPositionStyle(userCoords.x, userCoords.y)}
          title="Drag or click elsewhere to update your current location"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 bg-indigo-500 rounded-full scale-150 opacity-20 group-hover:scale-175 transition-transform" />
          <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
            <Navigation className="w-5 h-5 fill-white" />
          </div>
          {/* Label tooltip */}
          <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-indigo-900 text-white text-[10px] font-medium px-2 py-0.5 rounded-full shadow-md z-30 opacity-90">
            You (Campus Dorms)
          </div>
        </div>

        {/* Job Pins */}
        {jobs.map((job) => {
          const isSelected = selectedJobId === job.id;
          const color = categoryColors[job.category] || categoryColors[JobCategory.OTHER];
          
          return (
            <div
              key={job.id}
              className={`job-pin absolute cursor-pointer z-10 transition-all duration-300 ${
                isSelected ? "scale-125 z-30" : "hover:scale-110 hover:z-25"
              }`}
              style={getPositionStyle(job.coords.x, job.coords.y)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectJob(job.id);
              }}
              onMouseEnter={() => setHoveredJob(job)}
              onMouseLeave={() => setHoveredJob(null)}
            >
              {/* Pulse glow if selected */}
              {isSelected && (
                <div 
                  className="absolute -inset-2.5 rounded-full animate-ping opacity-25"
                  style={{ backgroundColor: color.hex }}
                />
              )}

              {/* Pin body */}
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all border-2 ${
                  isSelected 
                    ? "bg-slate-900 border-white text-white" 
                    : "bg-white border-slate-200"
                }`}
                style={!isSelected ? { borderColor: color.hex, color: color.hex } : {}}
              >
                <MapPin className="w-4 h-4 fill-current" />
              </div>

              {/* Minified Pay Label */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded shadow text-slate-800">
                ${job.payRate.toFixed(1)}/h
              </div>
            </div>
          );
        })}

        {/* Hover / Selection Quick Popup on Map */}
        {(hoveredJob || selectedJobId) && (
          (() => {
            const activeJob = hoveredJob || jobs.find(j => j.id === selectedJobId);
            if (!activeJob) return null;
            const color = categoryColors[activeJob.category] || categoryColors[JobCategory.OTHER];
            
            return (
              <div 
                className="absolute bottom-4 left-4 right-4 bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl flex items-center justify-between gap-4 pointer-events-auto backdrop-blur-sm border border-slate-800 animate-in fade-in slide-in-from-bottom-2 z-40"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span 
                      className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${color.hex}22`, color: color.hex }}
                    >
                      {activeJob.category}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {activeJob.distance.toFixed(1)} mi away
                    </span>
                  </div>
                  <h4 className="font-semibold text-sm text-white truncate">{activeJob.title}</h4>
                  <p className="text-xs text-slate-300 truncate">{activeJob.employer}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-sm">${activeJob.payRate.toFixed(2)}/hr</div>
                    <div className="text-[10px] text-slate-400">{activeJob.spotsRemaining} spots left</div>
                  </div>
                  <button 
                    onClick={() => onSelectJob(activeJob.id)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })()
        )}
      </div>

      {/* Map Footer / Key */}
      <div className="p-4 border-t-4 border-indigo-900 bg-indigo-50/60 flex flex-wrap gap-3 items-center justify-center text-xs text-indigo-950 font-bold">
        <span className="font-black uppercase tracking-wider text-indigo-900">Categories:</span>
        {Object.entries(categoryColors).map(([cat, theme]) => (
          <span key={cat} className="flex items-center gap-1.5 px-2 py-1 bg-white border-2 border-indigo-900 rounded-lg shadow-sm">
            <span className="w-3 h-3 rounded-full border border-indigo-950/20" style={{ backgroundColor: theme.hex }} />
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
