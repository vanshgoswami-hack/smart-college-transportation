"use client";

import React, { useState, useMemo } from "react";
import type {
  AppView,
  BusData,
  IssueData,
  NotificationData,
  RouteData,
  UserProfile,
} from "@/types/transit";
import {
  BusStatusBadge,
  IssueStatusBadge,
  OccupancyMeter,
} from "./StatusBadge";
import { CampusTransitMap } from "./CampusTransitMap";
import {
  Search,
  MapPin,
  Clock,
  AlertTriangle,
  Bell,
  Navigation,
  CheckCircle2,
  Bus,
  ArrowRight,
  Send,
  Sparkles,
  Filter,
  Footprints,
  Info,
  ShieldAlert,
} from "lucide-react";

export function StudentDashboardView({
  routes,
  buses,
  notifications,
  currentUser,
  onUpdateAssignedStop,
  onSelectBusForTracking,
  onReportBusIssue,
  onNavigate,
  onSimulateStep,
  autoSimulating,
  onToggleAutoSimulate,
}: {
  routes: RouteData[];
  buses: BusData[];
  notifications: NotificationData[];
  currentUser: UserProfile;
  onUpdateAssignedStop: (stopName: string) => void;
  onSelectBusForTracking: (bus: BusData) => void;
  onReportBusIssue: (bus: BusData) => void;
  onNavigate: (view: AppView) => void;
  onSimulateStep: () => Promise<void>;
  autoSimulating: boolean;
  onToggleAutoSimulate: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [routeFilter, setRouteFilter] = useState<string>("ALL");
  const [selectedMapBusId, setSelectedMapBusId] = useState<number | null>(
    buses[0]?.id ?? null
  );

  const assignedStop = currentUser.assignedStop || "North Gate Metro Plaza";

  const allStops = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        code: string;
        landmark: string;
        waitingStudents: number;
        routes: string[];
      }
    >();
    for (const r of routes) {
      for (const s of r.stops || []) {
        const existing = map.get(s.name);
        if (existing) {
          if (!existing.routes.includes(r.routeNumber)) {
            existing.routes.push(r.routeNumber);
          }
        } else {
          map.set(s.name, {
            name: s.name,
            code: s.code,
            landmark: s.landmark,
            waitingStudents: s.waitingStudents,
            routes: [r.routeNumber],
          });
        }
      }
    }
    return Array.from(map.values());
  }, [routes]);

  const currentAssignedStopObj =
    allStops.find((s) => s.name === assignedStop) || allStops[0];

  // Buses serving the student's assigned stop
  const busesServingAssignedStop = useMemo(() => {
    const servingRouteNums = currentAssignedStopObj?.routes || [];
    return buses
      .filter((b) => servingRouteNums.includes(b.routeNumber))
      .sort((a, b) => a.etaMinutes - b.etaMinutes);
  }, [buses, currentAssignedStopObj]);

  const nextArrivingAtStop = busesServingAssignedStop[0] || buses[0];

  // Filter buses by search query (route, destination, location, bus code) & status
  const filteredBuses = useMemo(() => {
    return buses.filter((bus) => {
      const routeObj = routes.find((r) => r.routeNumber === bus.routeNumber);
      const stopNames = (routeObj?.stops || []).map((s) => s.name).join(" ");
      const searchable = `${bus.busCode} ${bus.routeNumber} ${bus.currentLocation} ${bus.nextStop} ${routeObj?.name || ""} ${routeObj?.origin || ""} ${routeObj?.destination || ""} ${stopNames}`.toLowerCase();

      if (
        searchQuery.trim() &&
        !searchable.includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }

      if (statusFilter === "ON_TIME" && bus.status !== "On Time") return false;
      if (statusFilter === "DELAYED" && bus.status !== "Delayed") return false;
      if (
        statusFilter === "FULL" &&
        bus.status !== "Full" &&
        bus.occupancy / Math.max(1, bus.capacity) < 0.85
      )
        return false;
      if (statusFilter === "FAST_ETA" && bus.etaMinutes > 5) return false;

      if (routeFilter !== "ALL" && bus.routeNumber !== routeFilter) return false;

      return true;
    });
  }, [buses, routes, searchQuery, statusFilter, routeFilter]);

  const unreadNotifications = notifications.filter((n) => !n.isRead);

  return (
    <div className="space-y-6 pb-10">
      {/* Top Student Telemetry Welcome & Assigned Stop Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-2">
                <span>STUDENT TRANSIT COMMAND</span>
                <span>•</span>
                <span className="font-mono">
                  {currentUser.studentId || "STU-2026-8491"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {currentUser.name.split(" ")[0]}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time campus bus availability, crowd occupancy, and arrival
                predictions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate("live-tracking")}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Full Map View</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate("report-issue")}
                className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Report Issue</span>
              </button>
            </div>
          </div>

          {/* Assigned / Nearby Stop Selector Bar */}
          <div className="p-4 rounded-xl bg-slate-950/85 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    YOUR ASSIGNED / NEARBY STOP
                  </span>
                  <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-emerald-400" />3 min
                    walk (220m)
                  </span>
                </div>
                <div className="mt-1">
                  <select
                    aria-label="Select your assigned bus stop"
                    value={assignedStop}
                    onChange={(e) => onUpdateAssignedStop(e.target.value)}
                    className="bg-slate-900 border border-slate-700 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {allStops.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Landmark: {currentAssignedStopObj?.landmark} •{" "}
                  <strong className="text-slate-200">
                    {currentAssignedStopObj?.waitingStudents || 24} students
                    waiting
                  </strong>
                </p>
              </div>
            </div>

            {nextArrivingAtStop && (
              <div className="sm:text-right bg-slate-900/90 px-4 py-2.5 rounded-xl border border-slate-800 shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                  NEXT SHUTTLE FOR THIS CORRIDOR
                </span>
                <div className="flex sm:justify-end items-baseline gap-2 mt-0.5">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                    {nextArrivingAtStop.busCode} ({nextArrivingAtStop.routeNumber})
                  </span>
                  <span className="text-xl font-extrabold font-mono text-emerald-400 tabular-nums">
                    {nextArrivingAtStop.etaMinutes} min
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 block">
                  {Math.max(
                    0,
                    nextArrivingAtStop.capacity - nextArrivingAtStop.occupancy
                  )}{" "}
                  seats open
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Live Alerts & Quick Telemetry Summary Card */}
        <div className="lg:col-span-5 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Live Transit Alerts ({unreadNotifications.length} Unread)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("notifications")}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
            >
              View All →
            </button>
          </div>

          <div className="space-y-2.5">
            {notifications.slice(0, 2).map((n) => (
              <div
                key={n.id}
                onClick={() => onNavigate("notifications")}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                  n.severity === "critical"
                    ? "bg-rose-950/30 border-rose-500/35 text-rose-200"
                    : n.severity === "warning"
                    ? "bg-amber-950/30 border-amber-500/35 text-amber-200"
                    : "bg-slate-950/80 border-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-white">{n.title}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 shrink-0">
                    {n.routeNumber}
                  </span>
                </div>
                <p className="text-slate-300 line-clamp-2 leading-relaxed">
                  {n.message}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                ON TIME
              </span>
              <span className="text-lg font-extrabold font-mono text-emerald-400">
                {buses.filter((b) => b.status === "On Time").length} Buses
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                DELAYED
              </span>
              <span className="text-lg font-extrabold font-mono text-amber-400">
                {buses.filter((b) => b.status === "Delayed").length} Buses
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                FULL / CROWDED
              </span>
              <span className="text-lg font-extrabold font-mono text-rose-400">
                {buses.filter((b) => b.status === "Full").length} Buses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bus by Route or Destination + Filter Chips */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus by route number (e.g. R-101), destination (STEM, Library, Hostel), or bus code (PS-01)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL", label: "All Buses" },
              { id: "ON_TIME", label: "On Time" },
              { id: "DELAYED", label: "Delayed" },
              { id: "FULL", label: "Full / Crowded" },
              { id: "FAST_ETA", label: "ETA ≤ 5m" },
            ].map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  statusFilter === chip.id
                    ? "bg-indigo-600 text-white shadow"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Route Quick Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-xs">
          <span className="text-slate-400 font-medium inline-flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter by Corridor:
          </span>
          <button
            type="button"
            onClick={() => setRouteFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
              routeFilter === "ALL"
                ? "bg-slate-800 text-white border border-slate-600"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All Routes
          </button>
          {routes.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRouteFilter(r.routeNumber)}
              className={`px-2.5 py-1 rounded-lg font-mono font-semibold transition inline-flex items-center gap-1.5 cursor-pointer ${
                routeFilter === r.routeNumber
                  ? "bg-slate-800 text-white border border-slate-600"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: r.color }}
              />
              <span>{r.routeNumber}</span>
              <span className="hidden sm:inline text-slate-400 font-sans font-normal">
                ({r.destination})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Available Buses Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Bus className="w-5 h-5 text-indigo-400" />
            <span>
              Available Campus Buses ({filteredBuses.length} of {buses.length})
            </span>
          </h2>
          <span className="text-xs text-slate-400">
            Click any bus card to highlight on map or report an issue
          </span>
        </div>

        {filteredBuses.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-10 text-center space-y-3">
            <Bus className="w-10 h-10 text-slate-500 mx-auto" />
            <h3 className="text-base font-bold text-white">
              No Buses Match Your Current Filter
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Try clearing your search query or switching the status filter back
              to &ldquo;All Buses&rdquo; to view all active campus shuttles.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("ALL");
                setRouteFilter("ALL");
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredBuses.map((bus) => {
              const routeObj = routes.find(
                (r) => r.routeNumber === bus.routeNumber
              );
              const borderHighlight =
                bus.status === "Full"
                  ? "border-rose-500/40 hover:border-rose-500/70"
                  : bus.status === "Delayed"
                  ? "border-amber-500/40 hover:border-amber-500/70"
                  : "border-slate-800 hover:border-indigo-500/50";

              return (
                <div
                  key={bus.id}
                  className={`rounded-2xl bg-slate-900/90 border ${borderHighlight} p-5 flex flex-col justify-between gap-4 shadow-lg transition`}
                >
                  <div className="space-y-3">
                    {/* Card Header: Route Number, Bus Code & Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold text-white shadow"
                          style={{
                            backgroundColor: routeObj?.color || "#4F46E5",
                          }}
                        >
                          {bus.routeNumber}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-base font-extrabold font-mono text-white">
                              {bus.busCode}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400">
                              • {bus.plateNumber}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-1">
                            {routeObj?.name || bus.heading}
                          </p>
                        </div>
                      </div>

                      <BusStatusBadge
                        status={bus.status}
                        delayMinutes={bus.delayMinutes}
                        size="sm"
                      />
                    </div>

                    {/* Current Location, Next Stop & Big ETA Box */}
                    <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/90 flex items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="text-xs">
                          <span className="text-slate-400 block text-[10px] font-mono uppercase">
                            CURRENT BUS LOCATION
                          </span>
                          <span className="font-semibold text-slate-100 truncate block">
                            {bus.currentLocation}
                          </span>
                        </div>
                        <div className="text-xs">
                          <span className="text-slate-400 block text-[10px] font-mono uppercase">
                            NEXT ARRIVING STOP
                          </span>
                          <span className="font-semibold text-cyan-300 truncate block">
                            → {bus.nextStop}
                          </span>
                        </div>
                      </div>

                      <div className="text-right pl-3 border-l border-slate-800 shrink-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                          EST. ARRIVAL
                        </span>
                        <div className="text-2xl font-extrabold font-mono text-white tabular-nums leading-tight">
                          {bus.etaMinutes}
                          <span className="text-xs font-normal text-slate-400 ml-0.5">
                            min
                          </span>
                        </div>
                        {bus.delayMinutes > 0 ? (
                          <span className="text-[10px] font-mono text-amber-400">
                            Inc. +{bus.delayMinutes}m delay
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400">
                            On schedule
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Crowd / Occupancy Level Progress Meter */}
                    <OccupancyMeter
                      occupancy={bus.occupancy}
                      capacity={bus.capacity}
                    />
                  </div>

                  {/* Card Footer Buttons */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapBusId(bus.id);
                        onSelectBusForTracking(bus);
                        onNavigate("live-tracking");
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/30 text-xs font-semibold transition inline-flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Track on Live Map</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onReportBusIssue(bus)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition inline-flex items-center gap-1 cursor-pointer"
                      title="Report Overcrowding, Delay, or Issue"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Embedded Interactive Campus Map Preview on Student Dashboard */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>Real-Time Campus Bus Tracking Map</span>
            </h2>
            <p className="text-xs text-slate-400">
              Interactive live map showing all campus shuttles and stop waiting
              loads
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("live-tracking")}
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            Expand Full-Screen Map →
          </button>
        </div>

        <CampusTransitMap
          routes={routes}
          buses={buses}
          selectedBusId={selectedMapBusId}
          onSelectBus={(bus) => setSelectedMapBusId(bus.id)}
          assignedStop={assignedStop}
          onSelectAssignedStop={onUpdateAssignedStop}
          onSimulateStep={onSimulateStep}
          autoSimulating={autoSimulating}
          onToggleAutoSimulate={onToggleAutoSimulate}
          onReportBusIssue={onReportBusIssue}
          compact
        />
      </div>
    </div>
  );
}

export function RoutesAndStopsView({
  routes,
  buses,
  assignedStop,
  onUpdateAssignedStop,
  onSelectBusForTracking,
  onNavigate,
}: {
  routes: RouteData[];
  buses: BusData[];
  assignedStop: string;
  onUpdateAssignedStop: (stopName: string) => void;
  onSelectBusForTracking: (bus: BusData) => void;
  onNavigate: (view: AppView) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedRouteNum, setSelectedRouteNum] = useState<string>(
    routes[0]?.routeNumber || "R-101"
  );

  const filteredRoutes = useMemo(() => {
    if (!search.trim()) return routes;
    const q = search.toLowerCase();
    return routes.filter(
      (r) =>
        r.routeNumber.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.origin.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        (r.stops || []).some(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.landmark.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q)
        )
    );
  }, [routes, search]);

  const activeRoute =
    filteredRoutes.find((r) => r.routeNumber === selectedRouteNum) ||
    filteredRoutes[0] ||
    routes[0];

  const routeBuses = buses.filter(
    (b) => b.routeNumber === activeRoute?.routeNumber
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            CAMPUS CORRIDORS & TIMETABLES
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Routes & Assigned Bus Stops
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Explore stop-by-stop schedules, waiting student counts, and set your
            primary boarding stop.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search route, stop name, or landmark..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Route Corridors List */}
        <div className="lg:col-span-5 space-y-3">
          {filteredRoutes.map((route) => {
            const isSelected = activeRoute?.id === route.id;
            const activeShuttleCount = buses.filter(
              (b) => b.routeNumber === route.routeNumber
            ).length;

            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteNum(route.routeNumber)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold text-white"
                      style={{ backgroundColor: route.color }}
                    >
                      {route.routeNumber}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {route.name}
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Every {route.frequencyMinutes}m
                  </span>
                </div>

                <div className="text-xs text-slate-300 flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80">
                  <span>
                    {(route.stops || []).length} Campus Stops •{" "}
                    {route.totalDistanceKm} km
                  </span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {activeShuttleCount} Active Shuttles
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Stop-by-Stop Vertical Timeline */}
        {activeRoute && (
          <div className="lg:col-span-7 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold text-white"
                    style={{ backgroundColor: activeRoute.color }}
                  >
                    {activeRoute.routeNumber}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Frequency: Every {activeRoute.frequencyMinutes} mins
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {activeRoute.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Origin: <strong>{activeRoute.origin}</strong> → Destination:{" "}
                  <strong>{activeRoute.destination}</strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {routeBuses.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onSelectBusForTracking(b);
                      onNavigate("live-tracking");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{b.busCode}</span>
                    <span className="text-emerald-400">({b.etaMinutes}m)</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Stop Sequence Timeline */}
            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {(activeRoute.stops || []).map((stop, idx) => {
                const isAssigned = stop.name === assignedStop;
                const busAtStop = routeBuses.find(
                  (b) =>
                    b.currentLocation === stop.name || b.nextStop === stop.name
                );

                return (
                  <div
                    key={stop.id || idx}
                    className={`relative p-4 rounded-xl border transition ${
                      isAssigned
                        ? "bg-indigo-950/30 border-indigo-500/50"
                        : "bg-slate-950/80 border-slate-800/90"
                    }`}
                  >
                    {/* Timeline Node Dot */}
                    <span
                      className="w-4 h-4 rounded-full border-2 absolute -left-[23px] top-5"
                      style={{
                        backgroundColor: isAssigned ? "#38BDF8" : "#0F172A",
                        borderColor: isAssigned ? "#E0F2FE" : activeRoute.color,
                      }}
                    />

                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-slate-400">
                            STOP #{idx + 1} • {stop.code}
                          </span>
                          {isAssigned && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                              ★ Your Assigned Stop
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mt-0.5">
                          {stop.name}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Landmark: {stop.landmark} •{" "}
                          <span className="text-cyan-300 font-mono">
                            {stop.waitingStudents} waiting
                          </span>
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-xs font-mono text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                          +{stop.etaOffsetMinutes} min from origin
                        </span>
                        {!isAssigned && (
                          <button
                            type="button"
                            onClick={() => onUpdateAssignedStop(stop.name)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                          >
                            Set as My Assigned Stop
                          </button>
                        )}
                      </div>
                    </div>

                    {busAtStop && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                        <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Shuttle <strong>{busAtStop.busCode}</strong>{" "}
                          {busAtStop.currentLocation === stop.name
                            ? "is currently boarding at this stop"
                            : `is approaching next (ETA ${busAtStop.etaMinutes}m)`}
                        </span>
                        <span className="font-mono text-slate-300">
                          {busAtStop.occupancy}/{busAtStop.capacity} seats
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotificationsView({
  notifications,
  buses,
  onMarkRead,
  onMarkAllRead,
  onSelectBusForTracking,
  onNavigate,
}: {
  notifications: NotificationData[];
  buses: BusData[];
  onMarkRead: (id: number) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onSelectBusForTracking: (bus: BusData) => void;
  onNavigate: (view: AppView) => void;
}) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filtered = useMemo(() => {
    if (filterType === "ALL") return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 pb-10 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            PROACTIVE STUDENT ALERTS
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Transit Notifications ({unreadCount} Unread)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time alerts for buses arriving soon, delays, route changes, and
            full/overcrowded shuttles.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "ALL", label: "All Notifications" },
          { id: "arriving_soon", label: "Bus Arriving Soon" },
          { id: "delay", label: "Delays" },
          { id: "crowded", label: "Bus Full / Crowded" },
          { id: "route_change", label: "Route Changes" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              filterType === tab.id
                ? "bg-indigo-600 text-white shadow"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-8 text-center text-slate-400 text-sm">
            No notifications in this category.
          </div>
        ) : (
          filtered.map((n) => {
            const matchedBus = buses.find((b) => b.busCode === n.busCode);
            const badgeStyle =
              n.type === "crowded"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                : n.type === "delay"
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                : n.type === "route_change"
                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";

            const typeLabel =
              n.type === "crowded"
                ? "BUS FULL / CROWDED"
                : n.type === "delay"
                ? "DELAY ALERT"
                : n.type === "route_change"
                ? "ROUTE CHANGE"
                : "ARRIVING SOON";

            return (
              <div
                key={n.id}
                className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  n.isRead
                    ? "bg-slate-900/60 border-slate-800/80 opacity-80"
                    : "bg-slate-900 border-indigo-500/40 shadow-lg"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${badgeStyle}`}
                    >
                      {typeLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-slate-300 font-mono text-xs border border-slate-800">
                      {n.routeNumber}
                    </span>
                    {n.busCode && (
                      <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono text-xs">
                        Bus {n.busCode}
                      </span>
                    )}
                    {!n.isRead && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                        New
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{n.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {n.message}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  {matchedBus && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectBusForTracking(matchedBus);
                        onNavigate("live-tracking");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition cursor-pointer"
                    >
                      Track {matchedBus.busCode} →
                    </button>
                  )}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(n.id)}
                      className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ReportIssueView({
  routes,
  buses,
  issues,
  currentUser,
  preselectedBus,
  onSubmitIssue,
}: {
  routes: RouteData[];
  buses: BusData[];
  issues: IssueData[];
  currentUser: UserProfile;
  preselectedBus?: BusData | null;
  onSubmitIssue: (payload: {
    studentName: string;
    studentId: string;
    busCode: string;
    routeNumber: string;
    stopName: string;
    category: string;
    severity: string;
    description: string;
  }) => Promise<void>;
}) {
  const [busCode, setBusCode] = useState(
    preselectedBus?.busCode || buses[0]?.busCode || "PS-03"
  );
  const selectedBusObj =
    buses.find((b) => b.busCode === busCode) || preselectedBus || buses[0];

  const [category, setCategory] = useState<string>("Bus overcrowded");
  const [stopName, setStopName] = useState<string>(
    selectedBusObj?.currentLocation ||
      currentUser.assignedStop ||
      "Oakridge Off-Campus Apartments"
  );
  const [severity, setSeverity] = useState<string>("High");
  const [description, setDescription] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedBanner, setSubmittedBanner] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const allStopNames = Array.from(
    new Set(routes.flatMap((r) => (r.stops || []).map((s) => s.name)))
  );

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    setSubmissionError(null);
    setSubmittedBanner(false);
    try {
      await onSubmitIssue({
        studentName: currentUser.name || "Aiden Chen",
        studentId: currentUser.studentId || "STU-2026-8491",
        busCode,
        routeNumber: selectedBusObj?.routeNumber || "R-102",
        stopName,
        category,
        severity,
        description,
      });
      setDescription("");
      setSubmittedBanner(true);
      setTimeout(() => setSubmittedBanner(false), 5000);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : "Your report was not saved. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-10">
      {/* Left Column: Report Transport Problem Form */}
      <div className="lg:col-span-6 rounded-2xl bg-slate-900/95 border border-slate-800 p-6 shadow-xl space-y-5">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-bold">
            STUDENT FIELD FEEDBACK
          </span>
          <h1 className="text-2xl font-extrabold text-white mt-0.5">
            Report a Transport Problem
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Alert college transport administrators about overcrowded buses,
            delays, missing shuttles, or safety issues.
          </p>
        </div>

        {submissionError && <div role="alert" className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-sm text-rose-200">{submissionError}</div>}
        {submittedBanner && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <strong className="block text-white">
                Incident Report Logged & Dispatched!
              </strong>
              Transport Command and students on this route have been notified.
            </div>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Problem Category Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Issue Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  id: "Bus overcrowded",
                  label: "Bus overcrowded",
                  desc: "No seats / standing room full",
                },
                {
                  id: "Bus delayed",
                  label: "Bus delayed",
                  desc: "Running behind schedule",
                },
                {
                  id: "Bus missing",
                  label: "Bus missing",
                  desc: "Did not arrive at scheduled stop",
                },
                {
                  id: "Other transport issue",
                  label: "Other transport issue",
                  desc: "AC, display, route or safety",
                },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    category === cat.id
                      ? "bg-rose-500/15 border-rose-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-bold">{cat.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {cat.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Affected Bus & Route
              </label>
              <select
                value={busCode}
                onChange={(e) => setBusCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {buses.map((b) => (
                  <option key={b.id} value={b.busCode}>
                    {b.busCode} ({b.routeNumber} — {b.status})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Campus Bus Stop
              </label>
              <select
                value={stopName}
                onChange={(e) => setStopName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                {allStopNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Urgency / Severity Level
            </label>
            <div className="flex gap-2">
              {["Low", "Medium", "High", "Critical"].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeverity(lvl)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                    severity === lvl
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              What happened? (Details for Transport Dispatch)
            </label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the crowd level, approximate waiting students, or delay situation..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/25 transition inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {submitting
                ? "Transmitting to Fleet Command..."
                : "Submit Transport Issue Report"}
            </span>
          </button>
        </form>
      </div>

      {/* Right Column: Live Reported Issues & Admin Resolution Feed */}
      <div className="lg:col-span-6 space-y-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                TRANSPARENT INCIDENT LOG
              </span>
              <h2 className="text-xl font-bold text-white">
                Recent Student Reports ({issues.length})
              </h2>
            </div>
          </div>

          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      {issue.category}
                    </span>
                    <span className="font-mono text-xs font-bold text-indigo-300">
                      {issue.busCode} ({issue.routeNumber})
                    </span>
                  </div>
                  <IssueStatusBadge status={issue.status} />
                </div>

                <p className="text-xs text-slate-200 leading-relaxed">
                  &ldquo;{issue.description}&rdquo;
                </p>

                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>
                    Stop: <strong className="text-slate-300">{issue.stopName}</strong>
                  </span>
                  <span>
                    Reported by {issue.studentName} ({issue.studentId})
                  </span>
                </div>

                {issue.adminNote && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200">
                    <strong className="text-indigo-300 font-mono uppercase text-[10px] block">
                      ADMIN DISPATCH RESPONSE:
                    </strong>
                    {issue.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
