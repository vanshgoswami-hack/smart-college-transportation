import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, withSession } from "@/lib/session";
import { db } from "@/db";
import { routes, buses, notifications, issues } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import { HOURLY_ANALYTICS_DATA } from "@/lib/seed-data";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();

    const user = await getSessionUser(req);
    const visibleIssues = !user
      ? Promise.resolve([])
      : db.select().from(issues).where(user.role === "admin" ? undefined : (
          user.isDemo
            ? or(eq(issues.reportedByUserId, user.id!), and(isNull(issues.reportedByUserId), eq(issues.studentId, user.studentId || "")))
            : eq(issues.reportedByUserId, user.id!)
        )).orderBy(desc(issues.createdAt), desc(issues.id));
    const [allRoutes, allBuses, allNotifications, allIssues] = await Promise.all([
      db.select().from(routes).orderBy(asc(routes.routeNumber)),
      db.select().from(buses).orderBy(asc(buses.busCode)),
      db.select().from(notifications).orderBy(desc(notifications.createdAt), desc(notifications.id)),
      visibleIssues,
    ]);

    return NextResponse.json({
      routes: allRoutes,
      buses: allBuses,
      notifications: allNotifications,
      issues: allIssues,
      hourlyAnalytics: HOURLY_ANALYTICS_DATA,
      serverTime: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to fetch transit snapshot:", error);
    return NextResponse.json(
      { error: "Failed to load transit data" },
      { status: 500 }
    );
  }
}

// POST /api/transit — Advance live fleet telemetry by one tick across active buses
async function advanceTelemetry() {
  try {
    await ensureDatabaseSeeded();

    const allRoutes = await db.select().from(routes);
    const allBuses = await db.select().from(buses);

    const routeByNum = new Map(allRoutes.map((r) => [r.routeNumber, r]));

    for (const bus of allBuses) {
      const route = routeByNum.get(bus.routeNumber);
      const stops = route?.stops ?? [];
      if (stops.length < 2) continue;

      let newEta = bus.etaMinutes - 1;
      let newStopIdx = bus.currentStopIndex;
      let newCurrentLoc = bus.currentLocation;
      let newNextStop = bus.nextStop;
      let newOccupancy = bus.occupancy;
      let newStatus = bus.status;

      if (newEta <= 1) {
        // Advance to next stop along the route loop
        newStopIdx = (bus.currentStopIndex + 1) % stops.length;
        const nextStopIdx = (newStopIdx + 1) % stops.length;
        const currStopObj = stops[newStopIdx];
        const nextStopObj = stops[nextStopIdx];

        newCurrentLoc = currStopObj.name;
        newNextStop = nextStopObj.name;
        newEta = Math.max(
          3,
          Math.abs(nextStopObj.etaOffsetMinutes - currStopObj.etaOffsetMinutes) || 5
        );

        // Simulate realistic student boarding/alighting delta (-5 to +7)
        const delta = Math.floor(Math.random() * 11) - 4;
        newOccupancy = Math.max(8, Math.min(bus.capacity, bus.occupancy + delta));

        if (newOccupancy >= bus.capacity) {
          newStatus = "Full";
        } else if (bus.delayMinutes > 4) {
          newStatus = "Delayed";
        } else {
          newStatus = "On Time";
        }
      }

      const currStop = stops[newStopIdx] ?? stops[0];
      const nextStopObj = stops[(newStopIdx + 1) % stops.length] ?? stops[0];
      const progress = Math.min(0.85, Math.max(0.15, 1 - newEta / 8));
      const interpX = Math.round(
        currStop.x + (nextStopObj.x - currStop.x) * progress
      );
      const interpY = Math.round(
        currStop.y + (nextStopObj.y - currStop.y) * progress
      );

      await db
        .update(buses)
        .set({
          etaMinutes: newEta,
          currentStopIndex: newStopIdx,
          currentLocation: newCurrentLoc,
          nextStop: newNextStop,
          occupancy: newOccupancy,
          status: newStatus,
          mapX: interpX,
          mapY: interpY,
          lastUpdated: new Date(),
        })
        .where(eq(buses.id, bus.id));
    }

    const updatedBuses = await db
      .select()
      .from(buses)
      .orderBy(asc(buses.busCode));

    return NextResponse.json({ buses: updatedBuses });
  } catch (error) {
    console.error("Simulation tick error:", error);
    return NextResponse.json(
      { error: "Failed to advance fleet telemetry" },
      { status: 500 }
    );
  }
}

export const POST = withSession(advanceTelemetry);
