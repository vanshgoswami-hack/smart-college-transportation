"use client";

import React from "react";
import { CheckCircle2, Clock, AlertTriangle, Users } from "lucide-react";

export function BusStatusBadge({
  status,
  delayMinutes = 0,
  size = "md",
}: {
  status: string;
  delayMinutes?: number;
  size?: "sm" | "md";
}) {
  const padding =
    size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  if (status === "Full") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase bg-rose-500/15 text-rose-300 border border-rose-500/40 ${padding}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>FULL / OVERCROWDED</span>
      </span>
    );
  }

  if (status === "Delayed") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase bg-amber-500/15 text-amber-300 border border-amber-500/40 ${padding}`}
      >
        <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          DELAYED {delayMinutes > 0 ? `+${delayMinutes}M` : ""}
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 ${padding}`}
    >
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>ON TIME</span>
    </span>
  );
}

export function OccupancyMeter({
  occupancy,
  capacity,
  compact = false,
}: {
  occupancy: number;
  capacity: number;
  compact?: boolean;
}) {
  const pct = Math.min(100, Math.round((occupancy / Math.max(1, capacity)) * 100));
  const seatsLeft = Math.max(0, capacity - occupancy);

  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-400";
  let crowdLabel = "Seats Available";

  if (pct >= 95) {
    barColor = "bg-rose-500";
    textColor = "text-rose-400";
    crowdLabel = "Full / Standing Only";
  } else if (pct >= 80) {
    barColor = "bg-amber-500";
    textColor = "text-amber-400";
    crowdLabel = "Heavy Crowd";
  } else if (pct >= 55) {
    barColor = "bg-cyan-400";
    textColor = "text-cyan-300";
    crowdLabel = "Moderate Load";
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span>{crowdLabel}</span>
        </span>
        <span className="font-mono font-semibold tabular-nums text-slate-200">
          {occupancy}/{capacity}{" "}
          <span className={`ml-1 ${textColor}`}>({pct}%)</span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700/70">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
          <span>
            {seatsLeft === 0
              ? "0 open seats remaining"
              : `${seatsLeft} open seats remaining`}
          </span>
          <span className="font-mono">{100 - pct}% free</span>
        </div>
      )}
    </div>
  );
}

export function IssueStatusBadge({ status }: { status: string }) {
  if (status === "Resolved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Resolved
      </span>
    );
  }
  if (status === "Investigating") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Investigating
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
      Open Incident
    </span>
  );
}
