"use client";

import { useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, Eye, EyeOff, GraduationCap, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import type { AppView, RouteData, UserProfile } from "@/types/transit";
import { apiRequest } from "@/lib/client-api";

const inputClass = "w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-60";
const labelClass = "block text-xs font-semibold text-slate-300 mb-1.5";

async function authenticate(payload: Record<string, unknown>): Promise<UserProfile> {
  const result = await apiRequest<{ user: UserProfile }>("/api/auth", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!result.user?.id) throw new Error("Sign-in did not complete. Please try again.");
  // Verify that the browser actually retained the HttpOnly session cookie.
  const session = await apiRequest<{ user: UserProfile | null }>("/api/auth");
  if (!session.user || session.user.id !== result.user.id) {
    throw new Error("Your browser did not save the sign-in cookie. Open Power Stone in a new tab or allow cookies, then try again.");
  }
  return session.user;
}

function PasswordField({ value, onChange, signup = false, id }: {
  value: string;
  onChange: (value: string) => void;
  signup?: boolean;
  id: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className={labelClass}>Password</label>
      <div className="relative">
        <input id={id} name="password" required minLength={signup ? 8 : 1} maxLength={128}
          type={visible ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
          autoComplete={signup ? "new-password" : "current-password"}
          placeholder={signup ? "Create a password (at least 8 characters)" : "Enter your Power Stone password"}
          className={`${inputClass} pr-12`} aria-describedby={signup ? `${id}-help` : undefined} />
        <button type="button" onClick={() => setVisible((prev) => !prev)}
          aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer">
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {signup && <p id={`${id}-help`} className="text-xs text-slate-400 mt-1.5">Use at least 8 characters. Passwords are stored as salted hashes.</p>}
    </div>
  );
}

function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return <div role="alert" className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-200">
    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{message}</span>
  </div>;
}

export function StudentAuthView({ routes, currentUser, onAuthenticated, onNavigate }: {
  routes: RouteData[];
  currentUser: UserProfile | null;
  onAuthenticated: (user: UserProfile) => void;
  onNavigate: (view: AppView) => void;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [assignedStop, setAssignedStop] = useState(routes[0]?.stops[0]?.name || "North Gate Metro Plaza");
  const [preferredRoute, setPreferredRoute] = useState(routes[0]?.routeNumber || "R-101");
  const [pending, setPending] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stopNames = Array.from(new Set(routes.flatMap((route) => route.stops.map((stop) => stop.name))));

  async function submit(demo = false) {
    if (pending) return;
    setPending(demo ? "demo" : "form");
    setError(null);
    try {
      const user = await authenticate(demo ? { mode: "demo", role: "student" } : {
        mode, role: "student", email, password,
        ...(mode === "signup" ? { name, studentId, department, assignedStop, preferredRoute } : {}),
      });
      onAuthenticated(user);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  function changeMode(next: "login" | "signup") {
    setMode(next);
    setError(null);
  }

  return (
    <div className="max-w-xl mx-auto py-4 sm:py-6">
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400"><GraduationCap className="w-6 h-6" /></div>
          <div><span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">Student portal</span>
            <h1 className="text-2xl font-bold text-white">{mode === "login" ? "Student sign in" : "Create your account"}</h1>
          </div>
        </div>
        <p className="text-sm text-slate-400">{mode === "login" ? "Sign in with your Power Stone account to save your stop and manage your commute." : "Register with your email and a new password. You’ll be signed in when your account is created."}</p>

        {currentUser && <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-slate-300 space-y-2">
          <p>Currently signed in as <strong className="text-white">{currentUser.name}</strong>{currentUser.isDemo ? " (demo account)" : ""}.</p>
          <button type="button" onClick={() => onNavigate(currentUser.role === "admin" ? "admin-dashboard" : "student-dashboard")} className="text-indigo-300 hover:text-white font-semibold cursor-pointer">Continue to dashboard →</button>
        </div>}

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-sm font-semibold" aria-label="Student account options">
          <button type="button" disabled={!!pending} onClick={() => changeMode("login")} aria-pressed={mode === "login"}
            className={`flex-1 px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50 ${mode === "login" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>Sign in</button>
          <button type="button" disabled={!!pending} onClick={() => changeMode("signup")} aria-pressed={mode === "signup"}
            className={`flex-1 px-3 py-2 rounded-lg cursor-pointer disabled:opacity-50 ${mode === "signup" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}>Sign up</button>
        </div>

        <AuthError message={error} />
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }} aria-busy={pending === "form"}>
          <fieldset disabled={!!pending} className="space-y-4">
            {mode === "signup" && <div>
              <label htmlFor="student-name" className={labelClass}>Full name</label>
              <input id="student-name" name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" className={inputClass} />
            </div>}
            <div>
              <label htmlFor="student-email" className={labelClass}>Email address</label>
              <input id="student-email" name="email" type="email" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" className={inputClass} />
            </div>
            <PasswordField id="student-password" value={password} onChange={setPassword} signup={mode === "signup"} />
            {mode === "signup" && <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label htmlFor="student-id" className={labelClass}>Student ID <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="student-id" name="studentId" maxLength={100} value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="STU-2026-1234" className={inputClass} /></div>
                <div><label htmlFor="student-department" className={labelClass}>Department <span className="font-normal text-slate-500">(optional)</span></label>
                  <input id="student-department" name="department" maxLength={150} value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Computer Science" className={inputClass} /></div>
              </div>
              <div><label htmlFor="student-stop" className={labelClass}>Primary bus stop</label>
                <select id="student-stop" name="assignedStop" value={assignedStop} onChange={(e) => setAssignedStop(e.target.value)} className={inputClass}>
                  {stopNames.map((stop) => <option key={stop} value={stop}>{stop}</option>)}
                </select>
              </div>
              <div><label htmlFor="student-route" className={labelClass}>Preferred route</label>
                <select id="student-route" name="preferredRoute" value={preferredRoute} onChange={(e) => setPreferredRoute(e.target.value)} className={inputClass}>
                  {routes.map((route) => <option key={route.id} value={route.routeNumber}>{route.routeNumber} — {route.name}</option>)}
                </select>
              </div>
            </>}
            <button type="submit" disabled={!!pending} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition disabled:opacity-50 cursor-pointer">
              {pending === "form" ? <><LoaderCircle className="w-4 h-4 animate-spin" />{mode === "signup" ? "Creating your account…" : "Signing in…"}</> : <>{mode === "signup" ? "Create account & sign in" : "Sign in to student portal"}<ArrowRight className="w-4 h-4" /></>}
            </button>
          </fieldset>
        </form>

        <div className="pt-5 border-t border-slate-800 space-y-3">
          <p className="text-xs text-slate-400">Just exploring? Try a public sample account. No email or password needed.</p>
          <button type="button" disabled={!!pending} onClick={() => void submit(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-semibold text-sm cursor-pointer disabled:opacity-50">
            {pending === "demo" ? <><LoaderCircle className="w-4 h-4 animate-spin" />Opening student demo…</> : "Try student demo"}
          </button>
          <p className="text-center text-xs text-slate-400">Transport staff? <button type="button" disabled={!!pending} onClick={() => onNavigate("admin-login")} className="text-cyan-300 hover:underline cursor-pointer">Admin sign in</button></p>
        </div>
      </div>
    </div>
  );
}

export function AdminAuthView({ onAuthenticated, onNavigate }: {
  onAuthenticated: (user: UserProfile) => void;
  onNavigate: (view: AppView) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [badgeId, setBadgeId] = useState("");
  const [pending, setPending] = useState<"form" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(demo = false) {
    if (pending) return;
    setPending(demo ? "demo" : "form");
    setError(null);
    try {
      const user = await authenticate(demo ? { mode: "demo", role: "admin" } : {
        mode: "login", role: "admin", email, password, studentId: badgeId,
      });
      onAuthenticated(user);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Sign-in failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 sm:py-6">
      <div className="rounded-3xl bg-slate-900/95 border border-slate-800 p-5 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400"><ShieldCheck className="w-5 h-5" /></div>
          <div><span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">Transport operations</span>
            <h1 className="text-2xl font-bold text-white">Admin sign in</h1></div>
        </div>
        <p className="text-sm text-slate-400">Use your college-issued Power Stone staff account. Student accounts cannot access administrator tools.</p>
        <AuthError message={error} />
        <form onSubmit={(event: FormEvent) => { event.preventDefault(); void submit(); }} aria-busy={pending === "form"}>
          <fieldset disabled={!!pending} className="space-y-4">
            <div><label htmlFor="admin-email" className={labelClass}>Administrator email</label>
              <input id="admin-email" name="email" type="email" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@college.edu" className={inputClass} />
            </div>
            <PasswordField id="admin-password" value={password} onChange={setPassword} />
            <div><label htmlFor="admin-badge" className={labelClass}>Staff badge ID <span className="text-slate-500 font-normal">(if provided)</span></label>
              <input id="admin-badge" name="studentId" maxLength={100} value={badgeId} onChange={(e) => setBadgeId(e.target.value)} placeholder="Your assigned staff ID" className={inputClass} />
            </div>
            <button type="submit" disabled={!!pending} className="w-full py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
              {pending === "form" ? <><LoaderCircle className="w-4 h-4 animate-spin" />Signing in…</> : <><Lock className="w-4 h-4" />Sign in to admin portal</>}
            </button>
          </fieldset>
        </form>
        <div className="pt-5 border-t border-slate-800 space-y-3">
          <p className="text-xs text-slate-400">Exploring the prototype? The admin demo uses a public sample account and shared campus data.</p>
          <button type="button" disabled={!!pending} onClick={() => void submit(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 font-semibold text-sm cursor-pointer disabled:opacity-50">
            {pending === "demo" ? <><LoaderCircle className="w-4 h-4 animate-spin" />Opening admin demo…</> : "Try admin demo"}
          </button>
          <p className="text-center text-xs text-slate-400">Looking for your bus? <button type="button" disabled={!!pending} onClick={() => onNavigate("student-login")} className="text-indigo-300 hover:underline cursor-pointer">Student sign in</button></p>
        </div>
      </div>
    </div>
  );
}
