"use client";

import React from "react";
import type {
  AppView,
  BusData,
  RouteData,
} from "@/types/transit";
import { BusStatusBadge, OccupancyMeter } from "./StatusBadge";
import {
  Bus,
  MapPin,
  ShieldCheck,
  BarChart3,
  Clock,
  Users,
  Bell,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  Lock,
  Navigation,
  Radio,
} from "lucide-react";

export function LandingView({
  routes,
  buses,
  onNavigate,
  onSelectBusForTracking,
}: {
  routes: RouteData[];
  buses: BusData[];
  onNavigate: (view: AppView) => void;
  onSelectBusForTracking: (bus: BusData) => void;
}) {
  const onTimeCount = buses.filter((b) => b.status === "On Time").length;
  const totalCapacity = buses.reduce((acc, b) => acc + b.capacity, 0);
  const totalOccupied = buses.reduce((acc, b) => acc + b.occupancy, 0);
  const openSeats = Math.max(0, totalCapacity - totalOccupied);

  return (
    <div className="space-y-10 pb-10">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-[#0E172E] to-indigo-950/80 border border-slate-800/90 p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>POWER STONE • SMART COLLEGE TRANSIT TELEMETRY</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.12]">
              Eliminate Campus Bus Uncertainty with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300">
                Real-Time Telemetry.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              No more overcrowded shuttles, unpredictable arrival times, or long
              waits at campus stops.{" "}
              <strong className="text-white">Power Stone</strong> connects
              students and college transport administrators with live GPS bus
              tracking, crowd occupancy meters, instant delay alerts, and
              peak-hour demand analytics.
            </p>

            {/* Primary CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={() => onNavigate("student-dashboard")}
                className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition inline-flex items-center gap-2 cursor-pointer"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Launch Student Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate("live-tracking")}
                className="px-5 py-3 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 border border-cyan-500/30 font-semibold text-sm transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Navigation className="w-4 h-4 text-cyan-400" />
                <span>Open Live Bus Map</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate("admin-dashboard")}
                className="px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition inline-flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Admin Command Center</span>
              </button>
            </div>

            {/* Quick Login Links */}
            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => onNavigate("student-login")}
                className="hover:text-indigo-300 underline underline-offset-4 cursor-pointer"
              >
                Student Login / Signup →
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onNavigate("admin-login")}
                className="hover:text-cyan-300 underline underline-offset-4 cursor-pointer"
              >
                Transport Staff Login →
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onNavigate("analytics")}
                className="hover:text-emerald-300 underline underline-offset-4 cursor-pointer"
              >
                Peak-Hour Demand Analytics →
              </button>
            </div>
          </div>

          {/* Right Column: Live Campus Fleet Pulse Card */}
          <div className="lg:col-span-5 bg-slate-950/85 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  LIVE FLEET SNAPSHOT
                </span>
                <h3 className="text-base font-bold text-white">
                  Active Campus Shuttles
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {buses.length} Buses Online
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {buses.slice(0, 4).map((bus) => (
                <div
                  key={bus.id}
                  onClick={() => {
                    onSelectBusForTracking(bus);
                    onNavigate("live-tracking");
                  }}
                  className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800/90 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {bus.routeNumber}
                      </span>
                      <span className="text-sm font-bold font-mono text-white">
                        {bus.busCode}
                      </span>
                    </div>
                    <BusStatusBadge
                      status={bus.status}
                      delayMinutes={bus.delayMinutes}
                      size="sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="truncate">
                      Next: <strong className="text-white">{bus.nextStop}</strong>
                    </span>
                    <span className="font-mono font-bold text-cyan-300 shrink-0 ml-2">
                      ETA {bus.etaMinutes} min
                    </span>
                  </div>
                  <OccupancyMeter
                    occupancy={bus.occupancy}
                    capacity={bus.capacity}
                    compact
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-center">
              <div className="p-2 rounded-xl bg-slate-900/70">
                <div className="text-lg font-extrabold font-mono text-emerald-400">
                  {onTimeCount}/{buses.length}
                </div>
                <div className="text-[11px] text-slate-400">On Schedule</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/70">
                <div className="text-lg font-extrabold font-mono text-cyan-300">
                  {openSeats}
                </div>
                <div className="text-[11px] text-slate-400">Open Seats Now</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900/70">
                <div className="text-lg font-extrabold font-mono text-indigo-400">
                  {routes.length}
                </div>
                <div className="text-[11px] text-slate-400">Active Routes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem vs. Power Stone Solution Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-slate-900/75 border border-rose-500/25 p-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 text-rose-300 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>THE CAMPUS TRANSIT PROBLEM</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Why Students & Staff Struggle Daily
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <span>
                <strong>Unpredictable bus timings:</strong> Students wait 20+
                minutes without knowing if a shuttle has already passed or is
                stuck in traffic.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <span>
                <strong>Overcrowded buses:</strong> Shuttles arrive 100% full at
                mid-corridor stops, leaving students stranded before morning
                exams.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-400 font-bold">✕</span>
              <span>
                <strong>Lack of feedback & coordination:</strong> Transport
                administrators lack real-time visibility into delays, incidents,
                and peak-hour demand spikes.
              </span>
            </li>
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-900/75 border border-emerald-500/30 p-6 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>THE POWER STONE SOLUTION</span>
          </div>
          <h3 className="text-xl font-bold text-white">
            Precision Telemetry for Students & Admins
          </h3>
          <ul className="space-y-2.5 text-sm text-slate-300">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Live ETA & Seat Occupancy Meters:</strong> See exact
                arrival countdowns and open seat counts before walking to your
                assigned bus stop.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Interactive Map & Proactive Alerts:</strong> Instant
                notifications when a bus is arriving soon, delayed, rerouted, or
                at full capacity.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data-Driven Fleet Command:</strong> Admins dispatch
                buses, resolve student issue reports, and analyze peak travel
                hours & crowded corridors.
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Complete 12-Module Platform Directory */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-bold">
              COMPLETE ECOSYSTEM
            </span>
            <h2 className="text-2xl font-bold text-white">
              Explore All Power Stone Modules
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Click any module below to jump directly to that interactive workspace
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              view: "student-dashboard" as AppView,
              title: "Student Dashboard",
              desc: "Live buses, route numbers, ETAs, occupancy bars, and assigned stop monitor.",
              icon: Bus,
              badge: "Student Portal",
              color: "text-indigo-400 bg-indigo-500/15 border-indigo-500/30",
            },
            {
              view: "live-tracking" as AppView,
              title: "Live Bus Tracking Map",
              desc: "Interactive vector campus map with animated GPS bus markers & stop nodes.",
              icon: MapPin,
              badge: "Real-Time GPS",
              color: "text-cyan-400 bg-cyan-500/15 border-cyan-500/30",
            },
            {
              view: "routes-stops" as AppView,
              title: "Routes & Stops Directory",
              desc: "Searchable route corridors, stop timetables, waiting counts & stop assignment.",
              icon: Navigation,
              badge: "4 Corridors",
              color: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
            },
            {
              view: "notifications" as AppView,
              title: "Transit Notifications",
              desc: "Alerts for buses arriving soon, traffic delays, route changes, and full buses.",
              icon: Bell,
              badge: "Live Alerts",
              color: "text-amber-400 bg-amber-500/15 border-amber-500/30",
            },
            {
              view: "report-issue" as AppView,
              title: "Report an Issue",
              desc: "Report overcrowded, delayed, or missing buses and track admin resolution.",
              icon: AlertTriangle,
              badge: "Student Voice",
              color: "text-rose-400 bg-rose-500/15 border-rose-500/30",
            },
            {
              view: "admin-dashboard" as AppView,
              title: "Admin Command Center",
              desc: "Fleet KPIs, one-click status & occupancy dispatch controls, and incident triage.",
              icon: ShieldCheck,
              badge: "Admin Staff",
              color: "text-indigo-300 bg-indigo-500/15 border-indigo-500/30",
            },
            {
              view: "bus-management" as AppView,
              title: "Bus & Route Management",
              desc: "Add, edit, or delete buses, assign drivers, and manage campus route stops.",
              icon: Users,
              badge: "CRUD Fleet",
              color: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
            },
            {
              view: "analytics" as AppView,
              title: "Transport Analytics",
              desc: "Peak travel hours, frequently crowded routes, delay metrics & AI recommendations.",
              icon: BarChart3,
              badge: "Smart Insights",
              color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="text-left p-5 rounded-2xl bg-slate-900/85 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 transition group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center ${item.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                      {item.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                  <span>Open Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { StudentAuthView, AdminAuthView } from "./AuthViews";
