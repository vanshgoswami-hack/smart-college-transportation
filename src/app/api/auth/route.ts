import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { routes, users } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import { hashPassword, verifyPassword } from "@/lib/password";
import { checkRequestOrigin, createSessionResponse, deleteSessionResponse, getSessionUser, publicUser } from "@/lib/session";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const errorResponse = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

// Bound repeated credential attempts in this application instance.
const attempts = new Map<string, { count: number; expiresAt: number }>();
function allowAttempt(key: string) {
  const now = Date.now();
  for (const [entryKey, entry] of attempts) if (entry.expiresAt <= now) attempts.delete(entryKey);
  const entry = attempts.get(key) ?? { count: 0, expiresAt: now + 15 * 60 * 1000 };
  if (entry.count >= 20) return false;
  if (!attempts.has(key) && attempts.size >= 5000) return false;
  attempts.set(key, { ...entry, count: entry.count + 1 });
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Session restoration failed:", error);
    return errorResponse("We could not restore your session. Please try signing in again.", 503);
  }
}

export async function DELETE(req: NextRequest) {
  const originError = checkRequestOrigin(req);
  if (originError) return originError;
  try {
    return await deleteSessionResponse(req);
  } catch (error) {
    console.error("Sign-out failed:", error);
    return errorResponse("Sign-out could not be completed. Please try again.", 503);
  }
}

export async function POST(req: NextRequest) {
  const originError = checkRequestOrigin(req);
  if (originError) return originError;
  let body: Record<string, unknown>;
  try {
    const input = await req.json();
    if (!input || typeof input !== "object" || Array.isArray(input)) return errorResponse("Please submit a valid sign-in form.", 400);
    body = input;
  } catch {
    return errorResponse("Please submit a valid sign-in form.", 400);
  }

  const mode = text(body.mode) || "login";
  const role = text(body.role) || "student";
  if (!["login", "signup", "demo", "update_stop"].includes(mode)) return errorResponse("Unknown authentication action.", 400);
  if (!["student", "admin"].includes(role)) return errorResponse("Choose the student or administrator portal.", 400);

  try {
    await ensureDatabaseSeeded();

    if (mode === "update_stop") {
      const user = await getSessionUser(req);
      if (!user?.id) return errorResponse("Please sign in to save your assigned stop.", 401);
      const assignedStop = text(body.assignedStop);
      const preferredRoute = text(body.preferredRoute);
      if (!assignedStop && !preferredRoute) return errorResponse("Select a stop or preferred route.", 400);
      const allRoutes = await db.select().from(routes);
      if (assignedStop && !allRoutes.some((route) => route.stops.some((stop) => stop.name === assignedStop))) return errorResponse("That bus stop is no longer available.", 400);
      if (preferredRoute && !allRoutes.some((route) => route.routeNumber === preferredRoute)) return errorResponse("That route is no longer available.", 400);
      const [updated] = await db.update(users).set({
        ...(assignedStop ? { assignedStop } : {}),
        ...(preferredRoute ? { preferredRoute } : {}),
      }).where(eq(users.id, user.id)).returning();
      return NextResponse.json({ user: publicUser(updated) }, { headers: { "Cache-Control": "no-store" } });
    }

    if (mode === "demo") {
      if (process.env.POWER_STONE_DEMO_ACCESS === "false") return errorResponse("Demo access is disabled. Please use your own account.", 403);
      // The client cannot choose another user's identity through demo access.
      const demoEmail = role === "admin" ? "admin@powerstone.edu" : "aiden.chen@powerstone.edu";
      const [demoUser] = await db.select().from(users).where(eq(users.email, demoEmail)).limit(1);
      if (!demoUser?.isDemo || demoUser.role !== role) return errorResponse("The demo account is unavailable. Please use your own account.", 503);
      return await createSessionResponse(req, publicUser(demoUser));
    }

    const email = text(body.email).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return errorResponse("Enter a valid email address.", 400);
    if (!password || password.length > 128) return errorResponse("Enter your password (up to 128 characters).", 400);
    if (mode === "signup" && role !== "student") return errorResponse("Administrator accounts must be provisioned by college transport staff. Use the admin demo to explore sample data.", 403);
    if (mode === "signup" && (password.length < 8 || !password.trim())) return errorResponse("Choose a password with at least 8 characters.", 400);

    const attemptKey = `${req.headers.get("x-forwarded-for")?.split(",")[0] || "local"}:${email}`;
    if (!allowAttempt(attemptKey)) return errorResponse("Too many sign-in attempts. Please wait 15 minutes before trying again.", 429);
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (mode === "signup") {
      const name = text(body.name);
      if (name.length < 2 || name.length > 100) return errorResponse("Enter your full name (2–100 characters).", 400);
      if (existing) return errorResponse(existing.isDemo
        ? "This email belongs to a sample account. Use Try student demo, or register with your own email."
        : "An account with this email already exists. Please sign in instead.", 409);
      const studentId = text(body.studentId);
      const department = text(body.department);
      if (studentId.length > 100 || department.length > 150) return errorResponse("Your student ID or department is too long.", 400);
      const allRoutes = await db.select().from(routes);
      const assignedStop = text(body.assignedStop) || "North Gate Metro Plaza";
      const preferredRoute = text(body.preferredRoute) || "R-101";
      if (!allRoutes.some((route) => route.stops.some((stop) => stop.name === assignedStop))) return errorResponse("Please choose an available campus stop.", 400);
      if (!allRoutes.some((route) => route.routeNumber === preferredRoute)) return errorResponse("Please choose an available bus route.", 400);
      const [created] = await db.insert(users).values({
        name,
        email,
        passwordHash: await hashPassword(password),
        role: "student",
        isDemo: false,
        studentId: studentId || `STU-${randomUUID().slice(0, 8).toUpperCase()}`,
        department: department || "School of Engineering",
        assignedStop,
        preferredRoute,
      }).onConflictDoNothing({ target: users.email }).returning();
      if (!created) return errorResponse("An account with this email already exists. Please sign in instead.", 409);
      attempts.delete(attemptKey);
      return await createSessionResponse(req, publicUser(created), 201);
    }

    if (existing?.isDemo && !existing.passwordHash) {
      return errorResponse(`This is a demo account. Select Try ${existing.role === "admin" ? "admin" : "student"} demo below; no password is needed.`, 400);
    }
    if (!existing?.passwordHash) {
      // Spend equivalent password-hashing time for unknown accounts.
      await hashPassword(password);
      return errorResponse("Email or password is incorrect. New here? Create a student account first.", 401);
    }
    if (!await verifyPassword(password, existing.passwordHash)) return errorResponse("Email or password is incorrect. Please try again.", 401);
    if (existing.role !== role) return errorResponse(`This account belongs to the ${existing.role === "admin" ? "administrator" : "student"} portal. Please use that sign-in page.`, 403);
    const badgeId = text(body.studentId);
    if (role === "admin" && badgeId && badgeId !== existing.studentId) return errorResponse("The staff badge ID does not match this administrator account.", 401);
    attempts.delete(attemptKey);
    return await createSessionResponse(req, publicUser(existing));
  } catch (error) {
    console.error("Authentication request failed:", error);
    return errorResponse("The sign-in service is temporarily unavailable. Your details have not been lost; please try again.", 503);
  }
}
