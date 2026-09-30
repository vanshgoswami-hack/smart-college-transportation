"use client";

import React, { useState } from "react";
import type {
  AppView,
  BusData,
  IssueData,
  RouteData,
} from "@/types/transit";
import type { HourlyDemandPoint } from "@/lib/seed-data";
import {
  BusStatusBadge,
  IssueStatusBadge,
  OccupancyMeter,
} from "./StatusBadge";
import { CampusTransitMap } from "./CampusTransitMap";
import {
  ShieldCheck,
  Bus,
  Navigation,
  AlertTriangle,
  BarChart3,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Users,
  Radio,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Send,
  FastForward,
  MapPin,
} from "lucide-react";

export function AdminDashboardView({
  routes,
  buses,
  issues,
  onUpdateBus,
  onUpdateIssue,
  onBroadcastNotification,
  onNavigate,
  onSimulateStep,
  autoSimulating,
  onToggleAutoSimulate,
}: {
  routes: RouteData[];
  buses: BusData[];
  issues: IssueData[];
  onUpdateBus: (payload: Record<string, unknown>) => Promise<void>;
  onUpdateIssue: (
    id: number,
    status: string,
    adminNote?: string
  ) => Promise<void>;
  onBroadcastNotification: (payload: {
    type: string;
    title: string;
    message: string;
    routeNumber: string;
    busCode?: string;
    severity: string;
  }) => Promise<void>;
  onNavigate: (view: AppView) => void;
  onSimulateStep: () => Promise<void>;
  autoSimulating: boolean;
  onToggleAutoSimulate: () => void;
}) {
  const [selectedBusId, setSelectedBusId] = useState<number | null>(
    buses[0]?.id ?? null
  );
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("delay");
  const [alertRoute, setAlertRoute] = useState(
    routes[0]?.routeNumber || "R-101"
  );
  const [sendingAlert, setSendingAlert] = useState(false);

  const onTimeCount = buses.filter((b) => b.status === "On Time").length;
  const delayedCount = buses.filter((b) => b.status === "Delayed").length;
  const fullCount = buses.filter((b) => b.status === "Full").length;
  const totalCap = buses.reduce((acc, b) => acc + b.capacity, 0);
  const totalOcc = buses.reduce((acc, b) => acc + b.occupancy, 0);
  const avgLoadPct = Math.round((totalOcc / Math.max(1, totalCap)) * 100);
  const openIssues = issues.filter((i) => i.status !== "Resolved");

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    setSendingAlert(true);
    try {
      await onBroadcastNotification({
        type: alertType,
        title: alertTitle,
        message: alertMessage,
        routeNumber: alertRoute,
        severity:
          alertType === "crowded"
            ? "critical"
            : alertType === "delay"
            ? "warning"
            : "info",
      });
      setAlertTitle("");
      setAlertMessage("");
    } finally {
      setSendingAlert(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Admin Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>COLLEGE TRANSPORT ADMINISTRATOR COMMAND</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Fleet Operations & Live Dispatch Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitor bus locations, update status & crowd occupancy, manage
            routes, and resolve student reports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate("bus-management")}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add / Manage Buses</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("route-management")}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Navigation className="w-4 h-4 text-cyan-400" />
            <span>Manage Routes & Stops</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("analytics")}
            className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Peak Demand Analytics</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            ACTIVE FLEET ON-ROAD
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-white">
              {buses.length}
            </span>
            <span className="text-xs font-semibold text-emerald-400">
              {routes.length} Active Corridors
            </span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            {onTimeCount} On Time • {delayedCount} Delayed • {fullCount} Full
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            FLEET OCCUPANCY LOAD
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-cyan-300">
              {avgLoadPct}%
            </span>
            <span className="text-xs font-mono text-slate-300">
              {totalOcc}/{totalCap} seats
            </span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            {Math.max(0, totalCap - totalOcc)} open seats across campus
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            ON-TIME RELIABILITY
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-emerald-400">
              {Math.round((onTimeCount / Math.max(1, buses.length)) * 100)}%
            </span>
            <span className="text-xs text-amber-400 font-semibold">
              {delayedCount} Delayed
            </span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Avg campus delay: 3.4 mins
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            STUDENT INCIDENT REPORTS
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold font-mono text-rose-400">
              {openIssues.length}
            </span>
            <span className="text-xs text-slate-400">
              {issues.length} total logged
            </span>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Requires dispatcher review below
          </p>
        </div>
      </div>

      {/* Live Fleet Map Overview */}
      <CampusTransitMap
        routes={routes}
        buses={buses}
        selectedBusId={selectedBusId}
        onSelectBus={(b) => setSelectedBusId(b.id)}
        onSimulateStep={onSimulateStep}
        autoSimulating={autoSimulating}
        onToggleAutoSimulate={onToggleAutoSimulate}
        compact
      />

      {/* Quick Bus Status & Occupancy Dispatch Matrix */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white">
              Live Fleet Status & Occupancy Control Matrix
            </h2>
            <p className="text-xs text-slate-400">
              Instantly update bus status (On Time / Delayed / Full), adjust
              occupancy load, or advance a bus to its next stop.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("bus-management")}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
          >
            Open Full Bus CRUD Manager →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-800">
                <th className="py-3.5 px-4">Bus & Route</th>
                <th className="py-3.5 px-4">Current Location → Next Stop</th>
                <th className="py-3.5 px-4">ETA</th>
                <th className="py-3.5 px-4 w-56">Live Occupancy</th>
                <th className="py-3.5 px-4">Current Status</th>
                <th className="py-3.5 px-4 text-right">Quick Dispatch Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {buses.map((bus) => (
                <tr
                  key={bus.id}
                  className="hover:bg-slate-800/40 transition"
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {bus.routeNumber}
                      </span>
                      <div>
                        <div className="font-mono font-bold text-white text-sm">
                          {bus.busCode}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {bus.driverName}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">
                      {bus.currentLocation}
                    </div>
                    <div className="text-cyan-400 text-[11px]">
                      Next: {bus.nextStop}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-sm text-white">
                    {bus.etaMinutes}m
                  </td>

                  <td className="py-3.5 px-4">
                    <OccupancyMeter
                      occupancy={bus.occupancy}
                      capacity={bus.capacity}
                      compact
                    />
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus({
                            id: bus.id,
                            occupancy: Math.max(0, bus.occupancy - 5),
                          })
                        }
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] cursor-pointer"
                      >
                        -5 seats
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus({
                            id: bus.id,
                            occupancy: Math.min(bus.capacity, bus.occupancy + 5),
                          })
                        }
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] cursor-pointer"
                      >
                        +5 seats
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus({
                            id: bus.id,
                            occupancy: bus.capacity,
                            status: "Full",
                          })
                        }
                        className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-[11px] cursor-pointer"
                      >
                        Set Full
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <BusStatusBadge
                      status={bus.status}
                      delayMinutes={bus.delayMinutes}
                      size="sm"
                    />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus({
                            id: bus.id,
                            status: "On Time",
                            delayMinutes: 0,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          bus.status === "On Time"
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-800 text-slate-300 hover:bg-emerald-500/20"
                        }`}
                      >
                        On Time
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus({
                            id: bus.id,
                            status: "Delayed",
                            delayMinutes: 8,
                          })
                        }
                        className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                          bus.status === "Delayed"
                            ? "bg-amber-500 text-slate-950"
                            : "bg-slate-800 text-slate-300 hover:bg-amber-500/20"
                        }`}
                      >
                        Delay +8m
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBus({
                            id: bus.id,
                            advanceStop: true,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 font-semibold inline-flex items-center gap-1 cursor-pointer"
                        title="Advance bus to next stop on route"
                      >
                        <FastForward className="w-3 h-3" />
                        <span>Next Stop</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Grid: Reported Issues Triage + Broadcast Alert Composer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
                STUDENT INCIDENT QUEUE
              </span>
              <h3 className="text-lg font-bold text-white">
                Reported Transport Issues ({issues.length})
              </h3>
            </div>
          </div>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      {issue.category}
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-300">
                      Bus {issue.busCode} • {issue.routeNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      @ {issue.stopName}
                    </span>
                  </div>
                  <IssueStatusBadge status={issue.status} />
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  &ldquo;{issue.description}&rdquo;
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <span className="text-slate-400">
                    Student: <strong className="text-slate-200">{issue.studentName}</strong> ({issue.studentId})
                  </span>

                  <div className="flex items-center gap-1.5">
                    {issue.status !== "Investigating" && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateIssue(
                            issue.id,
                            "Investigating",
                            "Dispatch team notified driver and is monitoring route load."
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-semibold cursor-pointer"
                      >
                        Mark Investigating
                      </button>
                    )}
                    {issue.status !== "Resolved" && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateIssue(
                            issue.id,
                            "Resolved",
                            "Resolved by Campus Transit Command; relief shuttle dispatched."
                          )
                        }
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold cursor-pointer"
                      >
                        Resolve Issue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Broadcast Student Transit Alert */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
              CAMPUS-WIDE DISPATCH BROADCAST
            </span>
            <h3 className="text-lg font-bold text-white">
              Send Instant Student Notification
            </h3>
            <p className="text-xs text-slate-400">
              Push real-time alerts for delays, route detours, or relief buses
              directly to student dashboards.
            </p>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Alert Type
                </label>
                <select
                  value={alertType}
                  onChange={(e) => setAlertType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  <option value="arriving_soon">Bus Arriving Soon</option>
                  <option value="delay">Traffic / Schedule Delay</option>
                  <option value="crowded">Bus Full / Crowded</option>
                  <option value="route_change">Route / Stop Change</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Route
                </label>
                <select
                  value={alertRoute}
                  onChange={(e) => setAlertRoute(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.routeNumber}>
                      {r.routeNumber} — {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Alert Headline
              </label>
              <input
                type="text"
                required
                value={alertTitle}
                onChange={(e) => setAlertTitle(e.target.value)}
                placeholder="e.g. Relief Shuttle Deployed on R-102"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Notification Message
              </label>
              <textarea
                rows={3}
                required
                value={alertMessage}
                onChange={(e) => setAlertMessage(e.target.value)}
                placeholder="Enter details for students waiting at stops..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <button
              type="submit"
              disabled={sendingAlert}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {sendingAlert
                  ? "Broadcasting Alert..."
                  : "Broadcast Live Student Notification"}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function BusManagementView({
  routes,
  buses,
  onAddBus,
  onUpdateBus,
  onDeleteBus,
}: {
  routes: RouteData[];
  buses: BusData[];
  onAddBus: (payload: Record<string, unknown>) => Promise<void>;
  onUpdateBus: (payload: Record<string, unknown>) => Promise<void>;
  onDeleteBus: (id: number) => Promise<void>;
}) {
  const [busCode, setBusCode] = useState(`PS-0${buses.length + 1}`);
  const [plateNumber, setPlateNumber] = useState("CA-UNIV-8840");
  const [routeNumber, setRouteNumber] = useState(
    routes[0]?.routeNumber || "R-101"
  );
  const [driverName, setDriverName] = useState("Jordan Vance");
  const [driverPhone, setDriverPhone] = useState("+1 (555) 640-2291");
  const [capacity, setCapacity] = useState(50);
  const [occupancy, setOccupancy] = useState(18);
  const [status, setStatus] = useState("On Time");
  const [etaMinutes, setEtaMinutes] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [editingBusId, setEditingBusId] = useState<number | null>(null);

  const handleCreateBus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAddBus({
        busCode,
        plateNumber,
        routeNumber,
        driverName,
        driverPhone,
        capacity,
        occupancy,
        status,
        etaMinutes,
      });
      setBusCode(`PS-0${buses.length + 2}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
          FLEET INVENTORY & TELEMETRY CRUD
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Bus Fleet Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Add new campus shuttles, edit driver assignments, update bus status
          and crowd levels, or decommission vehicles.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Add New Bus Form */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/95 border border-slate-800 p-5 space-y-4 h-fit">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Deploy New Campus Shuttle</span>
          </h2>

          <form onSubmit={handleCreateBus} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Bus Code
                </label>
                <input
                  type="text"
                  required
                  value={busCode}
                  onChange={(e) => setBusCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  required
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Assigned Route
                </label>
                <select
                  value={routeNumber}
                  onChange={(e) => setRouteNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.routeNumber}>
                      {r.routeNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Initial Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                >
                  <option value="On Time">On Time</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Full">Full</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Driver Full Name
              </label>
              <input
                type="text"
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Driver Contact Number
              </label>
              <input
                type="text"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Seat Cap
                </label>
                <input
                  type="number"
                  min={15}
                  max={90}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Occupancy
                </label>
                <input
                  type="number"
                  min={0}
                  max={capacity}
                  value={occupancy}
                  onChange={(e) => setOccupancy(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  ETA (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={45}
                  value={etaMinutes}
                  onChange={(e) => setEtaMinutes(Number(e.target.value))}
                  className="w-full px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer"
            >
              {submitting ? "Deploying Bus..." : "Add Bus to Active Fleet"}
            </button>
          </form>
        </div>

        {/* Right: Active Fleet Cards with Inline Edit & Delete */}
        <div className="lg:col-span-8 space-y-3">
          {buses.map((bus) => {
            const isEditing = editingBusId === bus.id;
            return (
              <div
                key={bus.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center font-mono font-extrabold text-white text-sm">
                      {bus.busCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-indigo-300">
                          {bus.routeNumber}
                        </span>
                        <span className="font-mono text-xs text-slate-400">
                          {bus.plateNumber}
                        </span>
                        <BusStatusBadge
                          status={bus.status}
                          delayMinutes={bus.delayMinutes}
                          size="sm"
                        />
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Driver: <strong>{bus.driverName}</strong> ({bus.driverPhone}) • Current:{" "}
                        <strong className="text-white">{bus.currentLocation}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingBusId(isEditing ? null : bus.id)
                      }
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditing ? "Close Editor" : "Edit Telemetry"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteBus(bus.id)}
                      className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                      title="Delete Bus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <OccupancyMeter
                  occupancy={bus.occupancy}
                  capacity={bus.capacity}
                  compact
                />

                {isEditing && (
                  <div className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">
                        Change Route
                      </label>
                      <select
                        value={bus.routeNumber}
                        onChange={(e) =>
                          onUpdateBus({
                            id: bus.id,
                            routeNumber: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                      >
                        {routes.map((r) => (
                          <option key={r.id} value={r.routeNumber}>
                            {r.routeNumber}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        Set Status
                      </label>
                      <select
                        value={bus.status}
                        onChange={(e) =>
                          onUpdateBus({
                            id: bus.id,
                            status: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white"
                      >
                        <option value="On Time">On Time</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Full">Full</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        Occupancy ({bus.occupancy}/{bus.capacity})
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={bus.capacity}
                        value={bus.occupancy}
                        onChange={(e) =>
                          onUpdateBus({
                            id: bus.id,
                            occupancy: Number(e.target.value),
                          })
                        }
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        ETA Minutes ({bus.etaMinutes}m)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={bus.etaMinutes}
                        onChange={(e) =>
                          onUpdateBus({
                            id: bus.id,
                            etaMinutes: Number(e.target.value),
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function RouteManagementView({
  routes,
  onAddRoute,
  onUpdateRoute,
  onDeleteRoute,
}: {
  routes: RouteData[];
  onAddRoute: (payload: Record<string, unknown>) => Promise<void>;
  onUpdateRoute: (payload: Record<string, unknown>) => Promise<void>;
  onDeleteRoute: (id: number) => Promise<void>;
}) {
  const [routeNumber, setRouteNumber] = useState("R-110");
  const [name, setName] = useState("Innovation Quad Express");
  const [origin, setOrigin] = useState("North Gate Metro Plaza");
  const [destination, setDestination] = useState("Innovation Research Park");
  const [color, setColor] = useState("#8B5CF6");
  const [frequencyMinutes, setFrequencyMinutes] = useState(12);
  const [stopsInput, setStopsInput] = useState(
    "North Gate Metro Plaza, Central Library & Student Union, Science & Bio-Tech Pavilion, Innovation Research Park"
  );
  const [submitting, setSubmitting] = useState(false);
  const [newStopNameByRoute, setNewStopNameByRoute] = useState<
    Record<number, string>
  >({});

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const stopNames = stopsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const stops = stopNames.map((sName, idx) => ({
        id: `${routeNumber.toLowerCase()}-s${idx + 1}`,
        name: sName,
        code: `STP-0${idx + 1}`,
        sequence: idx + 1,
        etaOffsetMinutes: idx * 6,
        x: Math.min(900, 140 + idx * 210),
        y: 230 + (idx % 2 === 0 ? -50 : 60),
        landmark: "Campus Transit Stop",
        waitingStudents: 15 + idx * 5,
      }));

      await onAddRoute({
        routeNumber,
        name,
        origin,
        destination,
        color,
        frequencyMinutes,
        stops,
      });
      setRouteNumber(`R-${112 + routes.length}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAppendStop = async (route: RouteData) => {
    const newStopName = (newStopNameByRoute[route.id] || "").trim();
    if (!newStopName) return;
    const currentStops = route.stops || [];
    const idx = currentStops.length;
    const updatedStops = [
      ...currentStops,
      {
        id: `${route.routeNumber.toLowerCase()}-s${idx + 1}-${Date.now()}`,
        name: newStopName,
        code: `STP-0${idx + 1}`,
        sequence: idx + 1,
        etaOffsetMinutes: (currentStops[idx - 1]?.etaOffsetMinutes ?? 15) + 6,
        x: Math.min(910, 180 + idx * 145),
        y: 280 + (idx % 2 === 0 ? -45 : 45),
        landmark: "Added Campus Stop",
        waitingStudents: 16,
      },
    ];
    await onUpdateRoute({
      id: route.id,
      stops: updatedStops,
    });
    setNewStopNameByRoute((prev) => ({ ...prev, [route.id]: "" }));
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
          CORRIDOR & STOP TOPOLOGY BUILDER
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
          Route & Campus Stop Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Create new transit routes, customize stop sequences, and manage service
          frequencies.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Create New Route Form */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/95 border border-slate-800 p-5 space-y-4 h-fit">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Add New Campus Route</span>
          </h2>

          <form onSubmit={handleCreateRoute} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Route Number
                </label>
                <input
                  type="text"
                  required
                  value={routeNumber}
                  onChange={(e) => setRouteNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Frequency (Mins)
                </label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={frequencyMinutes}
                  onChange={(e) => setFrequencyMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 font-mono text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Route Corridor Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Origin Terminal
                </label>
                <input
                  type="text"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Comma-Separated Campus Stops
              </label>
              <textarea
                rows={3}
                required
                value={stopsInput}
                onChange={(e) => setStopsInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Route Line Color
              </label>
              <div className="flex gap-2">
                {["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-lg border-2 cursor-pointer ${
                        color === c ? "border-white scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition cursor-pointer"
            >
              {submitting ? "Creating Corridor..." : "Create Route & Stops"}
            </button>
          </form>
        </div>

        {/* Right: Existing Routes & Stop Manager */}
        <div className="lg:col-span-8 space-y-4">
          {routes.map((route) => (
            <div
              key={route.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold text-white"
                    style={{ backgroundColor: route.color }}
                  >
                    {route.routeNumber}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {route.name}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Every {route.frequencyMinutes} mins •{" "}
                      {(route.stops || []).length} Stops • {route.origin} →{" "}
                      {route.destination}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteRoute(route.id)}
                  className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition cursor-pointer"
                  title="Delete Route"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stop Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {(route.stops || []).map((stop, idx) => (
                  <div
                    key={stop.id || idx}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center gap-2"
                  >
                    <span className="font-mono font-bold text-indigo-400">
                      {idx + 1}.
                    </span>
                    <span className="text-slate-200 font-medium">
                      {stop.name}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      (+{stop.etaOffsetMinutes}m)
                    </span>
                  </div>
                ))}
              </div>

              {/* Add Stop to Route Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <input
                  type="text"
                  value={newStopNameByRoute[route.id] || ""}
                  onChange={(e) =>
                    setNewStopNameByRoute((prev) => ({
                      ...prev,
                      [route.id]: e.target.value,
                    }))
                  }
                  placeholder="Add a new campus stop to this route..."
                  className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleAppendStop(route)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600/25 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
                >
                  + Add Stop
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TransportAnalyticsView({
  routes,
  buses,
  hourlyAnalytics,
}: {
  routes: RouteData[];
  buses: BusData[];
  hourlyAnalytics: HourlyDemandPoint[];
}) {
  const [metricView, setMetricView] = useState<
    "riders" | "delays" | "overcrowded"
  >("riders");

  const maxRiders = Math.max(...hourlyAnalytics.map((h) => h.riders), 1000);

  // Sort routes by crowding frequency for "Frequently Crowded Routes"
  const crowdedRoutesRanked = [...routes].sort(
    (a, b) => b.crowdingFrequencyPct - a.crowdingFrequencyPct
  );

  // Sort routes by average delay for "Frequently Delayed Routes"
  const delayedRoutesRanked = [...routes].sort(
    (a, b) => b.avgDelayMinutes - a.avgDelayMinutes
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
            SMART DEMAND & TELEMETRY INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Transport Demand & Peak-Hour Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Identify peak travel hours, frequently crowded routes, delay
            bottlenecks, and AI-assisted fleet optimization insights.
          </p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMetricView("riders")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              metricView === "riders"
                ? "bg-indigo-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Passenger Demand
          </button>
          <button
            type="button"
            onClick={() => setMetricView("overcrowded")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              metricView === "overcrowded"
                ? "bg-rose-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Overcrowding Spikes
          </button>
          <button
            type="button"
            onClick={() => setMetricView("delays")}
            className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
              metricView === "delays"
                ? "bg-amber-500 text-slate-950"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Delay Minutes
          </button>
        </div>
      </div>

      {/* Peak Travel Hours Interactive Chart */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <span>
                Peak Travel Hours Curve (07:00 AM – 08:00 PM Campus Telemetry)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Morning surge peaks at <strong>08:00–09:00 AM (890 riders/hr)</strong>{" "}
              and Evening surge peaks at{" "}
              <strong>05:00 PM (920 riders/hr)</strong>.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-rose-500" />
              Peak Surge Exceeds Capacity
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-3 rounded bg-indigo-500" />
              Normal Class Shift
            </span>
          </div>
        </div>

        {/* Interactive Bar Chart */}
        <div className="grid grid-cols-14 gap-2 items-end h-60 pt-6 pb-2 px-2 bg-slate-950/80 rounded-xl border border-slate-800/80">
          {hourlyAnalytics.map((pt) => {
            const isOverCapacity = pt.riders > pt.capacity;
            const heightPct =
              metricView === "riders"
                ? Math.round((pt.riders / maxRiders) * 100)
                : metricView === "overcrowded"
                ? Math.max(12, Math.round((pt.overcrowdedBuses / 3) * 100))
                : Math.max(12, Math.round((pt.avgDelayMins / 10) * 100));

            const barColor =
              metricView === "delays"
                ? pt.avgDelayMins >= 6
                  ? "bg-amber-400"
                  : "bg-cyan-500"
                : metricView === "overcrowded"
                ? pt.overcrowdedBuses >= 2
                  ? "bg-rose-500"
                  : "bg-emerald-500"
                : isOverCapacity
                ? "bg-gradient-to-t from-rose-600 to-amber-400"
                : "bg-gradient-to-t from-indigo-600 to-cyan-400";

            const valLabel =
              metricView === "riders"
                ? `${pt.riders}`
                : metricView === "overcrowded"
                ? `${pt.overcrowdedBuses} bus`
                : `+${pt.avgDelayMins}m`;

            return (
              <div
                key={pt.hour}
                className="flex flex-col items-center justify-end h-full group"
              >
                <span className="text-[10px] font-mono font-bold text-slate-300 mb-1">
                  {valLabel}
                </span>
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[34px] rounded-t-lg transition-all duration-500 ${barColor}`}
                    style={{ height: `${heightPct}%` }}
                    title={`${pt.label}: ${pt.riders} riders / ${pt.capacity} seat cap (${pt.period})`}
                  />
                </div>
                <span className="text-[10px] font-mono text-slate-400 mt-2">
                  {pt.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Transportation Demand Pattern Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">
              MORNING SURGE WINDOW
            </span>
            <h4 className="text-base font-bold text-white mt-0.5">
              08:00 AM – 09:30 AM
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              890 riders/hr vs 750 seat capacity (+18% overflow), concentrated
              at South Maple Village & North Gate Metro.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold">
              MIDDAY INTER-CAMPUS SHIFT
            </span>
            <h4 className="text-base font-bold text-white mt-0.5">
              12:00 PM – 01:30 PM
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              High bidirectional student movement between Central Library,
              Dining Commons, and STEM Complex.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
              EVENING DEPARTURE PEAK
            </span>
            <h4 className="text-base font-bold text-white mt-0.5">
              04:30 PM – 06:00 PM
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              920 riders/hr departing labs and lecture halls toward regional
              rail and off-campus housing.
            </p>
          </div>
        </div>
      </div>

      {/* Frequently Crowded Routes & Frequently Delayed Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Frequently Crowded Routes */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
              OCCUPANCY BOTTLENECKS
            </span>
            <h3 className="text-lg font-bold text-white">
              Frequently Crowded Routes
            </h3>
            <p className="text-xs text-slate-400">
              Routes ranked by peak-hour overcrowding frequency and passenger
              demand score.
            </p>
          </div>

          <div className="space-y-3.5">
            {crowdedRoutesRanked.map((r) => (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
                      style={{ backgroundColor: r.color }}
                    >
                      {r.routeNumber}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {r.name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-rose-400">
                    {r.crowdingFrequencyPct}% Peak Crowding
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-500"
                    style={{ width: `${r.crowdingFrequencyPct}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Demand Index: {r.peakDemandScore}/100</span>
                  <span>Frequency: Every {r.frequencyMinutes} mins</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Frequently Delayed Routes */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
              SCHEDULE RELIABILITY METRICS
            </span>
            <h3 className="text-lg font-bold text-white">
              Frequently Delayed Routes
            </h3>
            <p className="text-xs text-slate-400">
              Average delay minutes and corridor congestion analysis by route.
            </p>
          </div>

          <div className="space-y-3.5">
            {delayedRoutesRanked.map((r) => {
              const onTimePct = Math.max(62, 98 - r.avgDelayMinutes * 3);
              return (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white"
                        style={{ backgroundColor: r.color }}
                      >
                        {r.routeNumber}
                      </span>
                      <span className="text-sm font-bold text-white">
                        {r.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-400">
                      Avg +{r.avgDelayMinutes} min delay
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.min(100, r.avgDelayMinutes * 9)}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>On-Time Rate: {onTimePct}%</span>
                    <span>
                      Origin: {r.origin} → {r.destination}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Smart AI Fleet Optimization Recommendations */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-cyan-950/50 border border-indigo-500/30 p-6 space-y-4">
        <div className="flex items-center gap-2 text-indigo-300 text-xs font-mono font-bold uppercase">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>POWER STONE SMART FLEET RECOMMENDATIONS</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              1. Reallocate 1 Reserve Shuttle to R-102 (08:00 AM)
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Route R-102 experiences 86% crowding frequency at Oakridge
              Apartments. Adding 1 shuttle reduces headway from 12m to 8m and
              drops peak occupancy to ~68%.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              2. Express Bypass from South Maple Village
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              52 students board at South Maple Village during morning rush.
              Running PS-03 as a direct express to Central Library cuts travel
              time by 6 minutes.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
            <h4 className="text-sm font-bold text-white">
              3. Signal Priority Adjustment on Route R-108
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Route R-108 averages +9 min delay near Medical Wing. Adjusting
              turnaround dwell time by 3 mins restores 94% on-time arrival.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
