import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import type { UserProfile } from "@/types/transit";

const COOKIE_NAME = "power_stone_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

export function publicUser(user: typeof users.$inferSelect): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === "admin" ? "admin" : "student",
    isDemo: user.isDemo,
    studentId: user.studentId ?? undefined,
    department: user.department ?? undefined,
    assignedStop: user.assignedStop ?? undefined,
    preferredRoute: user.preferredRoute ?? undefined,
  };
}

function cookieOptions(req: NextRequest) {
  const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || req.nextUrl.host;
  let hostname = "";
  try { hostname = new URL(`http://${host}`).hostname; } catch { /* Default to secure for unknown production hosts. */ }
  const loopback = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(hostname);
  // The hosted preview terminates TLS before Next.js and may report HTTP internally.
  // Public production hosts must still receive Secure, partitioned cookies.
  const secure = req.nextUrl.protocol === "https:"
    || req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https"
    || req.headers.get("origin")?.startsWith("https://") === true
    || (process.env.NODE_ENV === "production" && !loopback);
  return {
    httpOnly: true,
    secure,
    // Partitioned cookies also work when the HTTPS preview is embedded in an iframe.
    // Origin checks below protect cookie-authenticated mutations from CSRF.
    sameSite: secure ? "none" as const : "lax" as const,
    partitioned: secure,
    path: "/",
  };
}

export function checkRequestOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  try {
    const host = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || req.headers.get("host") || req.nextUrl.host;
    if (new URL(origin).host === host) return null;
  } catch { /* Invalid origins must not mutate authenticated data. */ }
  return NextResponse.json({ error: "This request came from an untrusted origin. Please reload Power Stone and try again." }, { status: 403 });
}

export async function getSessionUser(req: NextRequest): Promise<UserProfile | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  await ensureDatabaseSeeded();
  const [result] = await db.select({ user: users }).from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  if (!result) return null;
  if (result.user.isDemo && process.env.POWER_STONE_DEMO_ACCESS === "false") return null;
  return publicUser(result.user);
}

export async function createSessionResponse(req: NextRequest, user: UserProfile, status = 200): Promise<NextResponse> {
  if (!user.id) throw new Error("Cannot create a session without a persisted user.");
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  const previousToken = req.cookies.get(COOKIE_NAME)?.value;
  await db.transaction(async (tx) => {
    if (previousToken) await tx.delete(sessions).where(eq(sessions.tokenHash, tokenHash(previousToken)));
    await tx.delete(sessions).where(lt(sessions.expiresAt, new Date()));
    await tx.insert(sessions).values({ tokenHash: tokenHash(token), userId: user.id!, expiresAt });
  });
  const response = NextResponse.json({ user }, { status, headers: { "Cache-Control": "no-store" } });
  const options = cookieOptions(req);
  response.cookies.set(COOKIE_NAME, token, { ...options, maxAge: SESSION_SECONDS, expires: expiresAt });
  if (options.partitioned) {
    // Remove an old unpartitioned cookie without removing the new partitioned one.
    response.headers.append("Set-Cookie", `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None`);
  }
  return response;
}

export async function deleteSessionResponse(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    await ensureDatabaseSeeded();
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token)));
  }
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(COOKIE_NAME, "", { ...cookieOptions(req), maxAge: 0, expires: new Date(0) });
  return response;
}

export function withSession(
  handler: (req: NextRequest, user: UserProfile) => Promise<Response>,
  requiredRole?: UserProfile["role"],
) {
  return async (req: NextRequest): Promise<Response> => {
    const originError = checkRequestOrigin(req);
    if (originError) return originError;
    try {
      const user = await getSessionUser(req);
      if (!user) return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
      if (requiredRole && user.role !== requiredRole) {
        return NextResponse.json({ error: "A transport administrator account is required for this action." }, { status: 403 });
      }
      return await handler(req, user);
    } catch (error) {
      console.error("Authenticated request failed:", error);
      return NextResponse.json({ error: "Unable to verify your session. Please try again." }, { status: 503 });
    }
  };
}
