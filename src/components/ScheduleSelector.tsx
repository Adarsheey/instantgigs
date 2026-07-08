import React from "react";
import { DayOfWeek, ScheduleTimeSlot, TimeSession } from "../types";
import { Calendar, CheckCircle, Clock, Info } from "lucide-react";

interface ScheduleSelectorProps {
  busySchedule: ScheduleTimeSlot[];
  onToggleSlot: (day: DayOfWeek, session: TimeSession) => void;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SESSIONS: { id: TimeSession; label: string; time: string }[] = [
  { id: "morning", label: "Morning", time: "8 AM - 12 PM" },
  { id: "afternoon", label: "Afternoon", time: "12 PM - 5 PM" },
  { id: "evening", label: "Evening", time: "5 PM - 10 PM" }
];

export default function ScheduleSelector({ busySchedule, onToggleSlot }: ScheduleSelectorProps) {
  const isBusy = (day: DayOfWeek, session: TimeSession) => {
    return busySchedule.some(slot => slot.day === day && slot.session === session);
  };

  const toggleAllWeekdays = (busy: boolean) => {
    // Convenience helper
    DAYS.slice(0, 5).forEach(day => {
      SESSIONS.forEach(sess => {
        const currentlyBusy = isBusy(day, sess.id);
        if (currentlyBusy !== busy) {
          onToggleSlot(day, sess.id);
        }
      });
    });
  };

  return (
    <div className="bg-white rounded-[2rem] border-4 border-indigo-900 p-6 shadow-xl" id="schedule-planner-card">
      <div className="flex flex-wrap justify-between items-start gap-4 mb-5">
        <div>
          <h3 className="font-display font-black text-indigo-900 text-base sm:text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-600" />
            Class & Busy Schedule Planner
          </h3>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            Mark times when you have classes, study blocks, or are otherwise unavailable.
          </p>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => toggleAllWeekdays(true)}
            className="text-xs bg-amber-400 hover:bg-amber-500 border-2 border-indigo-900 font-black px-3.5 py-1.5 rounded-xl transition-all shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none text-indigo-950 cursor-pointer"
          >
            Mark Mon-Fri Busy
          </button>
          <button
            type="button"
            onClick={() => toggleAllWeekdays(false)}
            className="text-xs bg-rose-200 hover:bg-rose-300 border-2 border-indigo-900 font-black px-3.5 py-1.5 rounded-xl transition-all shadow-[0_3px_0_0_#1e1b4b] active:translate-y-0.5 active:shadow-none text-indigo-950 cursor-pointer"
          >
            Clear Weekdays
          </button>
        </div>
      </div>

      {/* Grid Timetable */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="border-b-2 border-indigo-100 text-[10px] font-black uppercase text-indigo-900 tracking-wider">
              <th className="py-3 pr-4 w-32">Time of Day</th>
              {DAYS.map(day => (
                <th key={day} className="py-3 px-2 text-center">
                  {day.substring(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SESSIONS.map(session => (
              <tr key={session.id} className="border-b border-indigo-50/60 last:border-0">
                <td className="py-4 pr-4">
                  <div className="font-bold text-xs text-indigo-950">{session.label}</div>
                  <div className="text-[10px] text-indigo-900/60 font-mono flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    {session.time}
                  </div>
                </td>
                {DAYS.map(day => {
                  const busy = isBusy(day, session.id);
                  return (
                    <td key={day} className="py-3 px-1.5 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleSlot(day, session.id)}
                        className={`w-full py-2.5 px-1.5 rounded-2xl text-[11px] font-black border-2 transition-all cursor-pointer shadow-[0_2px_0_0_rgba(30,27,75,0.15)] active:translate-y-0.5 active:shadow-none ${
                          busy
                            ? "bg-rose-100 border-rose-400 text-rose-900 hover:bg-rose-200"
                            : "bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100"
                        }`}
                      >
                        {busy ? "Class/Busy" : "Free"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Information Helper bar */}
      <div className="mt-6 flex gap-3 p-4 bg-indigo-50/70 rounded-[1.5rem] border-2 border-indigo-100 text-xs text-indigo-950 leading-relaxed font-medium">
        <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-indigo-900 block uppercase tracking-wider text-[10px] mb-1">How scheduling works</span> Our schedule matching engine automatically cross-references your busy hours above with any job's required hours. If there is an overlap, we'll flag it with a warning, letting you prioritize jobs that fit seamlessly around your coursework!
        </div>
      </div>
    </div>
  );
}
