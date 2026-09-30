"use client";

import React, { useState, useMemo } from "react";
import type { BusData, RouteData } from "@/types/transit";
import type { RouteStopItem } from "@/db/schema";
import { BusStatusBadge, OccupancyMeter } from "./StatusBadge";
import {
  Navigation,
  MapPin,
  Play,
  RefreshCw,
  AlertTriangle,
  Radio,
  Gauge,
  Phone,
  User,
  CheckCircle2,
  Compass,
  Layers,
} from "lucide-react";

interface CampusTransitMapProps {
  routes: RouteData[];
  buses: BusData[];
  selectedBusId?: number | null;
  onSelectBus?: (bus: BusData) => void;
  assignedStop?: string;
  onSelectAssignedStop?: (stopName: string) => void;
  onSimulateStep?: () => Promise<void>;
  autoSimulating?: boolean;
  onToggleAutoSimulate?: () => void;
  onReportBusIssue?: (bus: BusData) => void;
  compact?: boolean;
}

export function CampusTransitMap({
  routes,
  buses,
  selectedBusId,
  onSelectBus,
  assignedStop = "North Gate Metro Plaza",
  onSelectAssignedStop,
  onSimulateStep,
  autoSimulating = false,
  onToggleAutoSimulate,
  onReportBusIssue,
  compact = false,
}: CampusTransitMapProps) {
  const [routeFilter, setRouteFilter] = useState<string>("ALL");
  const [selectedStop, setSelectedStop] = useState<RouteStopItem | null>(null);
  const [stepping, setStepping] = useState(false);

  const visibleRoutes = useMemo(() => {
    if (routeFilter === "ALL") return routes;
    return routes.filter((r) => r.routeNumber === routeFilter);
  }, [routes, routeFilter]);

  const visibleBuses = useMemo(() => {
    if (routeFilter === "ALL") return buses;
    return buses.filter((b) => b.routeNumber === routeFilter);
  }, [buses, routeFilter]);

  // Deduplicate stops across visible routes by name so map labels stay clean
  const uniqueStops = useMemo(() => {
    const map = new Map<
      string,
      RouteStopItem & { servedByRoutes: { routeNumber: string; color: string }[] }
    >();
    for (const r of visibleRoutes) {
      for (const s of r.stops || []) {
        const existing = map.get(s.name);
        if (existing) {
          if (
            !existing.servedByRoutes.some(
              (sr) => sr.routeNumber === r.routeNumber
            )
          ) {
            existing.servedByRoutes.push({
              routeNumber: r.routeNumber,
              color: r.color,
            });
          }
        } else {
          map.set(s.name, {
            ...s,
            servedByRoutes: [{ routeNumber: r.routeNumber, color: r.color }],
          });
        }
      }
    }
    return Array.from(map.values());
  }, [visibleRoutes]);

  const activeBus = useMemo(() => {
    if (selectedBusId) {
      return buses.find((b) => b.id === selectedBusId) || visibleBuses[0] || null;
    }
    return visibleBuses[0] || null;
  }, [buses, visibleBuses, selectedBusId]);

  const handleStep = async () => {
    if (!onSimulateStep || stepping) return;
    setStepping(true);
    try {
      await onSimulateStep();
    } finally {
      setStepping(false);
    }
  };

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
      {/* Map Telemetry Control Header */}
      <div className="px-4 py-3.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                Power Stone Live GPS Campus Grid
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Click any shuttle marker or campus stop node to inspect real-time ETA & crowd load
            </p>
          </div>
        </div>

        {/* Route Filter Pills & Simulation Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setRouteFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                routeFilter === "ALL"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Routes ({routes.length})
            </button>
            {routes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRouteFilter(r.routeNumber)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition flex items-center gap-1.5 ${
                  routeFilter === r.routeNumber
                    ? "bg-slate-800 text-white border border-slate-600"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: r.color }}
                />
                {r.routeNumber}
              </button>
            ))}
          </div>

          {onSimulateStep && (
            <button
              type="button"
              onClick={handleStep}
              disabled={stepping}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 text-cyan-400 ${
                  stepping ? "animate-spin" : ""
                }`}
              />
              <span>Advance GPS Tick</span>
            </button>
          )}

          {onToggleAutoSimulate && (
            <button
              type="button"
              onClick={onToggleAutoSimulate}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                autoSimulating
                  ? "bg-indigo-600/25 border-indigo-500 text-indigo-200"
                  : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <Play className="w-3.5 h-3.5 text-indigo-400" />
              <span>{autoSimulating ? "Auto-GPS: ON" : "Auto-GPS: OFF"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive SVG Campus Vector Map */}
      <div className="relative bg-[#070D19] w-full overflow-hidden select-none">
        <svg
          viewBox="0 0 1000 560"
          className={`w-full ${
            compact ? "h-[340px] sm:h-[390px]" : "h-[400px] sm:h-[490px]"
          } block`}
        >
          <defs>
            <pattern
              id="campus-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1E293B"
                strokeWidth="0.7"
                strokeOpacity="0.65"
              />
            </pattern>
            <radialGradient id="campus-core-glow" cx="50%" cy="46%" r="45%">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.16" />
              <stop offset="60%" stopColor="#06B6D4" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#070D19" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Grid & Glow */}
          <rect width="1000" height="560" fill="url(#campus-grid)" />
          <rect width="1000" height="560" fill="url(#campus-core-glow)" />

          {/* Campus Geographical Zones / Blocks */}
          <g opacity="0.85">
            {/* Academic Core Zone */}
            <rect
              x="415"
              y="195"
              width="175"
              height="120"
              rx="18"
              fill="#0F172A"
              stroke="#334155"
              strokeWidth="1.2"
              strokeDasharray="4 4"
            />
            <text
              x="502"
              y="215"
              textAnchor="middle"
              fill="#64748B"
              fontSize="10"
              fontWeight="700"
              letterSpacing="1.5"
            >
              ACADEMIC CORE QUAD
            </text>

            {/* North Metro Hub */}
            <rect
              x="42"
              y="75"
              width="150"
              height="95"
              rx="14"
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth="1.2"
            />
            <text
              x="117"
              y="96"
              textAnchor="middle"
              fill="#475569"
              fontSize="9.5"
              fontWeight="700"
              letterSpacing="1.2"
            >
              NORTH METRO HUB
            </text>

            {/* STEM & Engineering Complex */}
            <rect
              x="790"
              y="140"
              width="165"
              height="105"
              rx="14"
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth="1.2"
            />
            <text
              x="872"
              y="162"
              textAnchor="middle"
              fill="#475569"
              fontSize="9.5"
              fontWeight="700"
              letterSpacing="1.2"
            >
              STEM & ROBOTICS PARK
            </text>

            {/* South Student Village */}
            <rect
              x="55"
              y="435"
              width="175"
              height="95"
              rx="14"
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth="1.2"
            />
            <text
              x="142"
              y="456"
              textAnchor="middle"
              fill="#475569"
              fontSize="9.5"
              fontWeight="700"
              letterSpacing="1.2"
            >
              SOUTH HOSTEL VILLAGE
            </text>

            {/* East Graduate & Medical District */}
            <rect
              x="785"
              y="430"
              width="170"
              height="95"
              rx="14"
              fill="#0F172A"
              stroke="#1E293B"
              strokeWidth="1.2"
            />
            <text
              x="870"
              y="452"
              textAnchor="middle"
              fill="#475569"
              fontSize="9.5"
              fontWeight="700"
              letterSpacing="1.2"
            >
              GRADUATE HOUSING EAST
            </text>
          </g>

          {/* Campus Arterial Roadways (Subtle background tracks) */}
          <g stroke="#1E293B" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.55">
            {visibleRoutes.map((route) => {
              const pts = (route.stops || [])
                .map((s) => `${s.x},${s.y}`)
                .join(" ");
              return <polyline key={`road-${route.id}`} points={pts} />;
            })}
          </g>

          {/* Colored Transit Route Lines */}
          {visibleRoutes.map((route) => {
            const pts = (route.stops || [])
              .map((s) => `${s.x},${s.y}`)
              .join(" ");
            return (
              <g key={`route-line-${route.id}`}>
                {/* Outer glow */}
                <polyline
                  points={pts}
                  fill="none"
                  stroke={route.color}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity="0.22"
                />
                {/* Main crisp route line */}
                <polyline
                  points={pts}
                  fill="none"
                  stroke={route.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Animated telemetry dash overlay */}
                <polyline
                  points={pts}
                  fill="none"
                  stroke="#F8FAFC"
                  strokeWidth="1.4"
                  strokeDasharray="4 14"
                  strokeLinecap="round"
                  strokeOpacity="0.55"
                />
              </g>
            );
          })}

          {/* Campus Stop Nodes */}
          {uniqueStops.map((stop) => {
            const isAssigned = stop.name === assignedStop;
            const isSelected = selectedStop?.name === stop.name;
            const primaryColor = stop.servedByRoutes[0]?.color || "#6366F1";

            return (
              <g
                key={stop.id}
                transform={`translate(${stop.x}, ${stop.y})`}
                onClick={() => setSelectedStop(stop)}
                className="cursor-pointer group"
              >
                {isAssigned && (
                  <circle
                    r="18"
                    fill="#4F46E5"
                    fillOpacity="0.2"
                    stroke="#818CF8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
                {isSelected && (
                  <circle
                    r="22"
                    fill="#06B6D4"
                    fillOpacity="0.2"
                    stroke="#22D3EE"
                    strokeWidth="1.8"
                  />
                )}

                <circle
                  r={isAssigned ? "8" : "6.5"}
                  fill="#0F172A"
                  stroke={isAssigned ? "#38BDF8" : primaryColor}
                  strokeWidth="3"
                />
                <circle
                  r="2.5"
                  fill={isAssigned ? "#38BDF8" : "#F8FAFC"}
                />

                {/* Stop Label Pill */}
                <g transform="translate(0, 20)">
                  <rect
                    x="-72"
                    y="-9"
                    width="144"
                    height="20"
                    rx="6"
                    fill="#0F172A"
                    fillOpacity="0.92"
                    stroke={isAssigned ? "#38BDF8" : "#334155"}
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill={isAssigned ? "#E0F2FE" : "#CBD5E1"}
                    fontSize="9.5"
                    fontWeight="600"
                  >
                    {stop.name.length > 22
                      ? `${stop.name.slice(0, 21)}…`
                      : stop.name}
                  </text>
                </g>

                {/* Waiting students count mini badge */}
                <g transform="translate(22, -14)">
                  <rect
                    x="-16"
                    y="-8"
                    width="32"
                    height="15"
                    rx="5"
                    fill="#1E293B"
                    stroke="#475569"
                    strokeWidth="0.8"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="8.5"
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {stop.waitingStudents}p
                  </text>
                </g>
              </g>
            );
          })}

          {/* Live Bus Markers */}
          {visibleBuses.map((bus) => {
            const isSelected = activeBus?.id === bus.id;
            const statusColor =
              bus.status === "Full"
                ? "#F43F5E"
                : bus.status === "Delayed"
                ? "#F59E0B"
                : "#10B981";
            const pct = Math.min(
              100,
              Math.round((bus.occupancy / Math.max(1, bus.capacity)) * 100)
            );

            return (
              <g
                key={bus.id}
                transform={`translate(${bus.mapX}, ${bus.mapY})`}
                onClick={() => onSelectBus && onSelectBus(bus)}
                className="cursor-pointer transition-transform duration-500"
              >
                {/* Outer Pulse Ring */}
                <circle
                  r={isSelected ? "28" : "21"}
                  fill={statusColor}
                  fillOpacity={isSelected ? "0.24" : "0.14"}
                  stroke={statusColor}
                  strokeWidth={isSelected ? "2" : "1"}
                  strokeOpacity="0.65"
                />

                {/* Bus Telemetry Capsule */}
                <rect
                  x="-38"
                  y="-16"
                  width="76"
                  height="32"
                  rx="10"
                  fill="#0F172A"
                  stroke={statusColor}
                  strokeWidth={isSelected ? "2.5" : "1.8"}
                />

                {/* Status Dot */}
                <circle cx="-26" cy="-4" r="4" fill={statusColor} />

                {/* Bus Code & Route */}
                <text
                  x="-17"
                  y="-1"
                  fill="#F8FAFC"
                  fontSize="10.5"
                  fontWeight="800"
                  fontFamily="monospace"
                >
                  {bus.busCode}
                </text>
                <text
                  x="15"
                  y="-1"
                  fill="#94A3B8"
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  {bus.routeNumber}
                </text>

                {/* ETA & Load Bottom Line */}
                <text
                  x="0"
                  y="11"
                  textAnchor="middle"
                  fill={statusColor}
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="monospace"
                >
                  ETA {bus.etaMinutes}m • {pct}%
                </text>
              </g>
            );
          })}
        </svg>

        {/* Map Legend Overlay Bottom-Left */}
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto flex flex-wrap items-center gap-3 px-3.5 py-2 rounded-xl bg-slate-950/90 backdrop-blur-md border border-slate-800/90 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            On Time
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            Delayed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Full / Overcrowded
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-sky-400 bg-slate-900" />
            My Assigned Stop
          </span>
        </div>

        {/* Selected Stop Popover (if user clicked a campus stop node) */}
        {selectedStop && (
          <div className="absolute top-3 right-3 w-72 rounded-xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/40 p-3.5 shadow-2xl text-xs">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                  STOP CODE: {selectedStop.code}
                </span>
                <h4 className="text-sm font-bold text-white">
                  {selectedStop.name}
                </h4>
                <p className="text-slate-400 text-[11px]">
                  {selectedStop.landmark}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStop(null)}
                className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 mb-2.5">
              <span className="text-slate-400">Waiting Students:</span>
              <span className="font-mono font-bold text-cyan-300">
                {selectedStop.waitingStudents} students
              </span>
            </div>
            {onSelectAssignedStop && (
              <button
                type="button"
                onClick={() => {
                  onSelectAssignedStop(selectedStop.name);
                  setSelectedStop(null);
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {assignedStop === selectedStop.name
                    ? "Currently Your Assigned Stop"
                    : "Set as My Assigned Stop"}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Bus Live Telemetry Inspector Drawer */}
      {activeBus && (
        <div className="p-4 bg-slate-950/90 border-t border-slate-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            <div className="lg:col-span-5 flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-mono text-indigo-300 uppercase">
                  BUS
                </span>
                <span className="text-sm font-mono font-extrabold text-white">
                  {activeBus.busCode}
                </span>
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {activeBus.routeNumber}
                  </span>
                  <BusStatusBadge
                    status={activeBus.status}
                    delayMinutes={activeBus.delayMinutes}
                    size="sm"
                  />
                  <span className="text-xs font-mono text-slate-400">
                    {activeBus.plateNumber}
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate">
                  <span className="text-slate-400">Current:</span>{" "}
                  <strong className="text-white">
                    {activeBus.currentLocation}
                  </strong>{" "}
                  → <span className="text-cyan-300">{activeBus.nextStop}</span>
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    {activeBus.driverName}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {activeBus.driverPhone}
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-cyan-400">
                    <Gauge className="w-3 h-3" />
                    {activeBus.speedKmh} km/h
                  </span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <OccupancyMeter
                occupancy={activeBus.occupancy}
                capacity={activeBus.capacity}
                compact
              />
            </div>

            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-3">
              <div className="text-left lg:text-right">
                <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  NEXT STOP ETA
                </span>
                <span className="text-2xl font-extrabold font-mono text-white tabular-nums">
                  {activeBus.etaMinutes}{" "}
                  <span className="text-xs font-normal text-slate-400">
                    min
                  </span>
                </span>
              </div>

              {onReportBusIssue && (
                <button
                  type="button"
                  onClick={() => onReportBusIssue(activeBus)}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Report Issue</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
