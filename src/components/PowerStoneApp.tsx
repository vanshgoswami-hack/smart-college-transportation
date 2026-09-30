"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import type { AppView, BusData, IssueData, NotificationData, RouteData, UserProfile } from "@/types/transit";
import { INITIAL_ROUTES, INITIAL_BUSES, INITIAL_NOTIFICATIONS, INITIAL_ISSUES, HOURLY_ANALYTICS_DATA, type HourlyDemandPoint } from "@/lib/seed-data";
import { apiRequest, ApiError } from "@/lib/client-api";
import { CampusTransitMap } from "./CampusTransitMap";
import { LandingView, StudentAuthView, AdminAuthView } from "./LandingAndAuthViews";
import { StudentDashboardView, RoutesAndStopsView, NotificationsView, ReportIssueView } from "./StudentViews";
import { AdminDashboardView, BusManagementView, RouteManagementView, TransportAnalyticsView } from "./AdminViews";
import { Bus, MapPin, Navigation, Bell, AlertTriangle, ShieldCheck, BarChart3, GraduationCap, Lock, Home, Radio, RefreshCw, Menu, X, Layers, LogOut } from "lucide-react";

const FALLBACK_ROUTES: RouteData[] = INITIAL_ROUTES.map((route, index) => ({ id: index + 1, ...route }));
const FALLBACK_BUSES: BusData[] = INITIAL_BUSES.map((bus, index) => ({ id: index + 1, routeId: 1, ...bus }));
const FALLBACK_NOTIFICATIONS: NotificationData[] = INITIAL_NOTIFICATIONS.map((notification, index) => ({ id: index + 1, createdAt: "2026-01-01T08:00:00.000Z", ...notification }));
const PREVIEW_PROFILE: UserProfile = {
  name: "Visitor", email: "", role: "student", studentId: "PREVIEW",
  assignedStop: "North Gate Metro Plaza", preferredRoute: "R-101",
};
const ADMIN_VIEWS = new Set<AppView>(["admin-dashboard", "bus-management", "route-management", "analytics"]);
const ALL_VIEWS = new Set<AppView>(["landing", "student-login", "student-dashboard", "live-tracking", "routes-stops", "notifications", "report-issue", "admin-login", ...ADMIN_VIEWS]);

function allowedView(view: AppView, user: UserProfile | null): AppView {
  if (ADMIN_VIEWS.has(view) && user?.role !== "admin") return "admin-login";
  if (view === "report-issue" && !user) return "student-login";
  return view;
}

interface Snapshot {
  routes: RouteData[];
  buses: BusData[];
  notifications: NotificationData[];
  issues: IssueData[];
  hourlyAnalytics: HourlyDemandPoint[];
}

export function PowerStoneApp() {
  const [activeView, setActiveView] = useState<AppView>("student-dashboard");
  const [routes, setRoutes] = useState<RouteData[]>(FALLBACK_ROUTES);
  const [buses, setBuses] = useState<BusData[]>(FALLBACK_BUSES);
  const [notifications, setNotifications] = useState<NotificationData[]>(FALLBACK_NOTIFICATIONS);
  const [issues, setIssues] = useState<IssueData[]>([]);
  const [hourlyAnalytics, setHourlyAnalytics] = useState<HourlyDemandPoint[]>(HOURLY_ANALYTICS_DATA);
  const [authenticatedUser, setAuthenticatedUser] = useState<UserProfile | null>(null);
  const userRef = useRef<UserProfile | null>(null);
  const currentUser = authenticatedUser ?? PREVIEW_PROFILE;
  const [authLoading, setAuthLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedBusForMap, setSelectedBusForMap] = useState<BusData | null>(null);
  const [preselectedIssueBus, setPreselectedIssueBus] = useState<BusData | null>(null);
  const [autoSimulating, setAutoSimulating] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage((previous) => previous === message ? null : previous), 5000);
  }, []);

  const applyUser = useCallback((user: UserProfile | null) => {
    userRef.current = user;
    setAuthenticatedUser(user);
  }, []);

  const navigate = useCallback((view: AppView) => {
    const next = allowedView(view, userRef.current);
    setActiveView(next);
    setMobileMenuOpen(false);
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const data = await apiRequest<Snapshot>("/api/transit");
      if (Array.isArray(data.routes)) setRoutes(data.routes);
      if (Array.isArray(data.buses)) setBuses(data.buses);
      if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      if (Array.isArray(data.issues)) setIssues(data.issues);
      if (Array.isArray(data.hourlyAnalytics)) setHourlyAnalytics(data.hourlyAnalytics);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load transit data.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const { user } = await apiRequest<{ user: UserProfile | null }>("/api/auth");
        if (cancelled) return;
        applyUser(user);
        const hash = window.location.hash.slice(1) as AppView;
        navigate(ALL_VIEWS.has(hash) ? hash : user?.role === "admin" ? "admin-dashboard" : "student-dashboard");
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Could not restore your session.");
          const hash = window.location.hash.slice(1) as AppView;
          if (ALL_VIEWS.has(hash)) navigate(hash);
        }
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    }
    void fetchSnapshot();
    void restore();
    return () => { cancelled = true; };
  }, [applyUser, fetchSnapshot, navigate]);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.slice(1) as AppView;
      if (ALL_VIEWS.has(hash)) navigate(hash);
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [navigate]);

  const handleAuthenticated = (user: UserProfile) => {
    applyUser(user);
    navigate(user.role === "admin" ? "admin-dashboard" : "student-dashboard");
    showToast(`${user.isDemo ? "Demo session opened" : "Signed in"} as ${user.name}`);
    void fetchSnapshot();
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await apiRequest("/api/auth", { method: "DELETE" });
      const previousRole = userRef.current?.role;
      applyUser(null);
      setIssues([]);
      navigate(previousRole === "admin" ? "admin-login" : "student-login");
      showToast("You have been signed out.");
      void fetchSnapshot();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Sign-out failed. Please try again.");
    } finally { setSigningOut(false); }
  };

  const reportRequestError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      applyUser(null);
      navigate("student-login");
    }
    showToast(error instanceof Error ? error.message : "The request failed. Please try again.");
  }, [applyUser, navigate, showToast]);

  const handleSimulateStep = useCallback(async () => {
    if (!userRef.current) {
      navigate("student-login");
      showToast("Sign in or try a demo account to run the sample GPS simulation.");
      return;
    }
    try {
      const data = await apiRequest<{ buses: BusData[] }>("/api/transit", { method: "POST" });
      setBuses(data.buses);
    } catch (error) { reportRequestError(error); }
  }, [navigate, reportRequestError, showToast]);

  useEffect(() => {
    if (!autoSimulating || !authenticatedUser) return;
    const interval = setInterval(() => { void handleSimulateStep(); }, 7000);
    return () => clearInterval(interval);
  }, [autoSimulating, authenticatedUser, handleSimulateStep]);

  const handleUpdateAssignedStop = async (stopName: string) => {
    if (!userRef.current) {
      navigate("student-login");
      showToast("Sign in to save your assigned bus stop.");
      return;
    }
    try {
      const { user } = await apiRequest<{ user: UserProfile }>("/api/auth", {
        method: "POST", body: JSON.stringify({ mode: "update_stop", assignedStop: stopName }),
      });
      applyUser(user);
      showToast(`Assigned boarding stop updated to ${stopName}`);
    } catch (error) { reportRequestError(error); }
  };

  async function mutate(url: string, method: string, payload: Record<string, unknown> | undefined, message: string) {
    try {
      await apiRequest(url, { method, ...(payload ? { body: JSON.stringify(payload) } : {}) });
      await fetchSnapshot();
      showToast(message);
    } catch (error) { reportRequestError(error); }
  }

  const handleSubmitIssue = async (payload: {
    studentName: string; studentId: string; busCode: string; routeNumber: string;
    stopName: string; category: string; severity: string; description: string;
  }) => {
    await apiRequest("/api/issues", { method: "POST", body: JSON.stringify(payload) });
    await fetchSnapshot();
    showToast(`Reported "${payload.category}" for Bus ${payload.busCode}`);
  };
  const handleMarkNotificationRead = async (id: number) => { await mutate("/api/notifications", "PATCH", { id }, "Notification marked as read"); };
  const handleMarkAllNotificationsRead = async () => { await mutate("/api/notifications", "PATCH", { markAllRead: true }, "All notifications marked as read"); };
  const handleAddBus = async (payload: Record<string, unknown>) => { await mutate("/api/buses", "POST", payload, `Deployed new shuttle ${payload.busCode}`); };
  const handleUpdateBus = async (payload: Record<string, unknown>) => { await mutate("/api/buses", "PATCH", payload, "Bus telemetry and status updated"); };
  const handleDeleteBus = async (id: number) => { await mutate(`/api/buses?id=${id}`, "DELETE", undefined, "Shuttle removed from active fleet"); };
  const handleAddRoute = async (payload: Record<string, unknown>) => { await mutate("/api/routes", "POST", payload, `Created campus route ${payload.routeNumber}`); };
  const handleUpdateRoute = async (payload: Record<string, unknown>) => { await mutate("/api/routes", "PATCH", payload, "Route stops and schedule updated"); };
  const handleDeleteRoute = async (id: number) => { await mutate(`/api/routes?id=${id}`, "DELETE", undefined, "Route removed"); };
  const handleUpdateIssue = async (id: number, status: string, adminNote?: string) => { await mutate("/api/issues", "PATCH", { id, status, adminNote }, `Incident #${id} marked as ${status}`); };
  const handleBroadcastNotification = async (payload: { type: string; title: string; message: string; routeNumber: string; busCode?: string; severity: string }) => { await mutate("/api/notifications", "POST", payload, `Broadcasted alert for ${payload.routeNumber}`); };

  const unreadNotificationsCount = notifications.filter((notification) => !notification.isRead).length;
  const openIssuesCount = issues.filter((issue) => issue.status !== "Resolved").length;
  const isAdminView = activeView === "admin-login" || ADMIN_VIEWS.has(activeView);

  const navSections = [
    {
      group: "Platform Overview",
      items: [
        { id: "landing" as AppView, label: "1. Landing Page", icon: Home },
      ],
    },
    {
      group: "Student Portal",
      items: [
        {
          id: "student-dashboard" as AppView,
          label: "2. Student Dashboard",
          icon: Bus,
        },
        {
          id: "live-tracking" as AppView,
          label: "3. Live Bus Tracking",
          icon: MapPin,
        },
        {
          id: "routes-stops" as AppView,
          label: "4. Routes & Stops",
          icon: Navigation,
        },
        {
          id: "notifications" as AppView,
          label: "5. Notifications",
          icon: Bell,
          badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
        },
        {
          id: "report-issue" as AppView,
          label: "6. Report an Issue",
          icon: AlertTriangle,
        },
        {
          id: "student-login" as AppView,
          label: "7. Student Login / Signup",
          icon: GraduationCap,
        },
      ],
    },
    {
      group: "Admin Command Center",
      items: [
        {
          id: "admin-dashboard" as AppView,
          label: "8. Admin Dashboard",
          icon: ShieldCheck,
          badge: openIssuesCount > 0 ? openIssuesCount : undefined,
        },
        {
          id: "bus-management" as AppView,
          label: "9. Bus Management",
          icon: Layers,
        },
        {
          id: "route-management" as AppView,
          label: "10. Route Management",
          icon: Navigation,
        },
        {
          id: "analytics" as AppView,
          label: "11. Transport Analytics",
          icon: BarChart3,
        },
        {
          id: "admin-login" as AppView,
          label: "12. Admin Login",
          icon: Lock,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Top Global Telemetry Navigation Header */}
      <header className="sticky top-0 z-40 h-16 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Brand Logo & Mobile Drawer Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("landing")}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-indigo-500/20">
              <Bus className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-indigo-300 transition">
                  POWER STONE
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  GPS LIVE
                </span>
              </div>
              <span className="block text-[11px] text-slate-400 leading-none">
                Smart College Transit System
              </span>
            </div>
          </button>
        </div>

        {/* Center Workspace Switcher (Landing | Student Portal | Admin Command) */}
        <div className="hidden md:flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => navigate("landing")}
            className={`px-3.5 py-1.5 rounded-lg transition cursor-pointer ${
              activeView === "landing"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => navigate("student-dashboard")}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              !isAdminView && activeView !== "landing"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("admin-dashboard")}
            className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
              isAdminView
                ? "bg-cyan-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Command</span>
          </button>
        </div>

        {/* Right Controls: Notifications Bell, Simulate Step & Active User Badge */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSimulateStep}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition cursor-pointer"
            title="Advance live bus positions and ETAs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Step GPS</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("notifications")}
            className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4 text-amber-400" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate(isAdminView ? "admin-login" : "student-login")
            }
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs cursor-pointer"
          >
            <span className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
              {authenticatedUser ? authenticatedUser.name.charAt(0) : "?"}
            </span>
            <span className="font-medium text-slate-200">
              {authenticatedUser ? `${authenticatedUser.name.split(" ")[0]}${authenticatedUser.isDemo ? " · Demo" : ""}` : "Sign in"}
            </span>
          </button>
          {authenticatedUser && (
            <button type="button" onClick={handleSignOut} disabled={signingOut} aria-label="Sign out"
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 cursor-pointer disabled:opacity-50">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-indigo-600 text-white text-xs font-semibold shadow-2xl border border-indigo-400/40 flex items-center gap-2">
          <Radio className="w-4 h-4 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Layout Body with Persistent Sidebar + Workspace Content */}
      <div className="flex-1 flex">
        {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
        <aside
          className={`${
            mobileMenuOpen
              ? "fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 pt-16"
              : "hidden lg:block w-64 shrink-0 bg-slate-950/60"
          } border-r border-slate-800/80 p-4 space-y-6 overflow-y-auto`}
        >
          {navSections.map((section) => (
            <div key={section.group} className="space-y-1.5">
              <div className="px-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                {section.group}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      navigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      active
                        ? "bg-indigo-600/20 text-white border border-indigo-500/40 shadow"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/70"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          active ? "text-indigo-400" : "text-slate-500"
                        }`}
                      />
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Live Fleet Health Mini Card in Sidebar */}
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase text-cyan-400 font-bold">
                FLEET PULSE
              </span>
              <span className="text-[11px] font-mono text-emerald-400">
                {buses.length} Active
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Assigned Stop:{" "}
              <strong className="text-slate-200 block truncate">
                {currentUser.assignedStop}
              </strong>
            </div>
          </div>
        </aside>

        {/* Active View Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px] mx-auto w-full">
          {loadError && <div role="alert" className="mb-4 rounded-xl p-3.5 border border-amber-500/30 bg-amber-500/10 text-sm text-amber-200">
            {loadError} <button type="button" onClick={() => window.location.reload()} className="ml-2 underline cursor-pointer">Retry</button>
          </div>}
          {!authLoading && !authenticatedUser && !["student-login", "admin-login", "landing"].includes(activeView) && (
            <div className="mb-5 rounded-xl p-3.5 border border-indigo-500/30 bg-indigo-500/10 text-xs sm:text-sm text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <span>Preview mode · Sign in to save your stop, report issues, or access staff tools.</span>
              <button type="button" onClick={() => navigate("student-login")} className="font-semibold text-indigo-300 hover:text-white cursor-pointer">Sign in / Try demo →</button>
            </div>
          )}
          {authLoading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">
                Restoring your Power Stone session…
              </p>
            </div>
          ) : (
            <>
              {activeView === "landing" && (
                <LandingView
                  routes={routes}
                  buses={buses}
                  onNavigate={navigate}
                  onSelectBusForTracking={(b) => setSelectedBusForMap(b)}
                />
              )}

              {activeView === "student-login" && (
                <StudentAuthView
                  routes={routes}
                  currentUser={authenticatedUser}
                  onAuthenticated={handleAuthenticated}
                  onNavigate={navigate}
                />
              )}

              {activeView === "admin-login" && (
                <AdminAuthView
                  onAuthenticated={handleAuthenticated}
                  onNavigate={navigate}
                />
              )}

              {activeView === "student-dashboard" && (
                <StudentDashboardView
                  routes={routes}
                  buses={buses}
                  notifications={notifications}
                  currentUser={currentUser}
                  onUpdateAssignedStop={handleUpdateAssignedStop}
                  onSelectBusForTracking={(b) => setSelectedBusForMap(b)}
                  onReportBusIssue={(b) => {
                    setPreselectedIssueBus(b);
                    navigate("report-issue");
                  }}
                  onNavigate={navigate}
                  onSimulateStep={handleSimulateStep}
                  autoSimulating={autoSimulating}
                  onToggleAutoSimulate={() =>
                    setAutoSimulating((prev) => !prev)
                  }
                />
              )}

              {activeView === "live-tracking" && (
                <div className="space-y-5 pb-10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
                        REAL-TIME GPS CAMPUS TELEMETRY
                      </span>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Live Bus Tracking Map
                      </h1>
                      <p className="text-xs sm:text-sm text-slate-400">
                        Track active buses along campus routes, inspect crowd
                        occupancy, and monitor stop arrival countdowns.
                      </p>
                    </div>
                  </div>

                  <CampusTransitMap
                    routes={routes}
                    buses={buses}
                    selectedBusId={selectedBusForMap?.id ?? buses[0]?.id}
                    onSelectBus={(b) => setSelectedBusForMap(b)}
                    assignedStop={currentUser.assignedStop}
                    onSelectAssignedStop={handleUpdateAssignedStop}
                    onSimulateStep={handleSimulateStep}
                    autoSimulating={autoSimulating}
                    onToggleAutoSimulate={() =>
                      setAutoSimulating((prev) => !prev)
                    }
                    onReportBusIssue={(b) => {
                      setPreselectedIssueBus(b);
                      navigate("report-issue");
                    }}
                  />
                </div>
              )}

              {activeView === "routes-stops" && (
                <RoutesAndStopsView
                  routes={routes}
                  buses={buses}
                  assignedStop={
                    currentUser.assignedStop || "North Gate Metro Plaza"
                  }
                  onUpdateAssignedStop={handleUpdateAssignedStop}
                  onSelectBusForTracking={(b) => setSelectedBusForMap(b)}
                  onNavigate={navigate}
                />
              )}

              {activeView === "notifications" && (
                <NotificationsView
                  notifications={notifications}
                  buses={buses}
                  onMarkRead={handleMarkNotificationRead}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onSelectBusForTracking={(b) => setSelectedBusForMap(b)}
                  onNavigate={navigate}
                />
              )}

              {activeView === "report-issue" && (
                <ReportIssueView
                  routes={routes}
                  buses={buses}
                  issues={issues}
                  currentUser={currentUser}
                  preselectedBus={preselectedIssueBus}
                  onSubmitIssue={handleSubmitIssue}
                />
              )}

              {activeView === "admin-dashboard" && (
                <AdminDashboardView
                  routes={routes}
                  buses={buses}
                  issues={issues}
                  onUpdateBus={handleUpdateBus}
                  onUpdateIssue={handleUpdateIssue}
                  onBroadcastNotification={handleBroadcastNotification}
                  onNavigate={navigate}
                  onSimulateStep={handleSimulateStep}
                  autoSimulating={autoSimulating}
                  onToggleAutoSimulate={() =>
                    setAutoSimulating((prev) => !prev)
                  }
                />
              )}

              {activeView === "bus-management" && (
                <BusManagementView
                  routes={routes}
                  buses={buses}
                  onAddBus={handleAddBus}
                  onUpdateBus={handleUpdateBus}
                  onDeleteBus={handleDeleteBus}
                />
              )}

              {activeView === "route-management" && (
                <RouteManagementView
                  routes={routes}
                  onAddRoute={handleAddRoute}
                  onUpdateRoute={handleUpdateRoute}
                  onDeleteRoute={handleDeleteRoute}
                />
              )}

              {activeView === "analytics" && (
                <TransportAnalyticsView
                  routes={routes}
                  buses={buses}
                  hourlyAnalytics={hourlyAnalytics}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
