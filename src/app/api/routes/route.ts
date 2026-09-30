import { withSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { routes, notifications, type RouteStopItem } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import { eq } from "drizzle-orm";

async function createRoute(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const {
      routeNumber,
      name,
      origin,
      destination,
      color = "#6366F1",
      frequencyMinutes = 15,
      totalDistanceKm = "10.5",
      stops = [],
    } = body;

    if (!routeNumber || !name || !origin || !destination) {
      return NextResponse.json(
        { error: "Route number, name, origin, and destination are required." },
        { status: 400 }
      );
    }

    const formattedStops: RouteStopItem[] =
      Array.isArray(stops) && stops.length > 0
        ? stops.map((s: Partial<RouteStopItem>, idx: number) => ({
            id: s.id || `${routeNumber.toLowerCase()}-s${idx + 1}`,
            name: s.name || `Stop ${idx + 1}`,
            code: s.code || `STP-0${idx + 1}`,
            sequence: idx + 1,
            etaOffsetMinutes:
              s.etaOffsetMinutes !== undefined ? Number(s.etaOffsetMinutes) : idx * 6,
            x: s.x ?? 180 + idx * 170,
            y: s.y ?? 220 + (idx % 2 === 0 ? -45 : 55),
            landmark: s.landmark || "Campus Transit Shelter",
            waitingStudents: s.waitingStudents ?? 18,
          }))
        : [
            {
              id: `${routeNumber.toLowerCase()}-s1`,
              name: origin,
              code: "ORG-01",
              sequence: 1,
              etaOffsetMinutes: 0,
              x: 160,
              y: 240,
              landmark: "Departure Terminal",
              waitingStudents: 22,
            },
            {
              id: `${routeNumber.toLowerCase()}-s2`,
              name: "Central Library & Student Union",
              code: "CLU-02",
              sequence: 2,
              etaOffsetMinutes: 8,
              x: 495,
              y: 255,
              landmark: "Clocktower Plaza Stop",
              waitingStudents: 35,
            },
            {
              id: `${routeNumber.toLowerCase()}-s3`,
              name: destination,
              code: "DST-03",
              sequence: 3,
              etaOffsetMinutes: 16,
              x: 820,
              y: 260,
              landmark: "Arrival Terminal",
              waitingStudents: 14,
            },
          ];

    const [createdRoute] = await db
      .insert(routes)
      .values({
        routeNumber: String(routeNumber).trim().toUpperCase(),
        name: String(name).trim(),
        origin: String(origin).trim(),
        destination: String(destination).trim(),
        color,
        frequencyMinutes: Number(frequencyMinutes) || 15,
        totalDistanceKm: String(totalDistanceKm || "10.5"),
        stops: formattedStops,
        peakDemandScore: 76,
        avgDelayMinutes: 2,
        crowdingFrequencyPct: 38,
        active: true,
      })
      .returning();

    await db.insert(notifications).values({
      type: "route_change",
      title: `New Campus Route ${createdRoute.routeNumber} Launched`,
      message: `${createdRoute.name} (${createdRoute.origin} → ${createdRoute.destination}) is now active every ${createdRoute.frequencyMinutes} mins.`,
      routeNumber: createdRoute.routeNumber,
      severity: "info",
      isRead: false,
    });

    return NextResponse.json({ route: createdRoute }, { status: 201 });
  } catch (error) {
    console.error("Failed to create route:", error);
    return NextResponse.json(
      { error: "Failed to create route. Route number may already exist." },
      { status: 500 }
    );
  }
}

async function updateRoute(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Route ID is required." },
        { status: 400 }
      );
    }

    const existingList = await db
      .select()
      .from(routes)
      .where(eq(routes.id, Number(id)));
    const existing = existingList[0];
    if (!existing) {
      return NextResponse.json({ error: "Route not found." }, { status: 404 });
    }

    const updatedStops: RouteStopItem[] = Array.isArray(updates.stops)
      ? updates.stops.map((s: Partial<RouteStopItem>, idx: number) => ({
          id: s.id || `${existing.routeNumber.toLowerCase()}-s${idx + 1}`,
          name: s.name || `Stop ${idx + 1}`,
          code: s.code || `STP-0${idx + 1}`,
          sequence: idx + 1,
          etaOffsetMinutes:
            s.etaOffsetMinutes !== undefined ? Number(s.etaOffsetMinutes) : idx * 6,
          x: s.x ?? Math.min(900, 130 + idx * 165),
          y: s.y ?? 260 + (idx % 2 === 0 ? -40 : 45),
          landmark: s.landmark || "Campus Stop Shelter",
          waitingStudents: s.waitingStudents ?? 20,
        }))
      : existing.stops;

    const [updatedRoute] = await db
      .update(routes)
      .set({
        routeNumber: updates.routeNumber ?? existing.routeNumber,
        name: updates.name ?? existing.name,
        origin: updates.origin ?? existing.origin,
        destination: updates.destination ?? existing.destination,
        color: updates.color ?? existing.color,
        frequencyMinutes:
          updates.frequencyMinutes !== undefined
            ? Number(updates.frequencyMinutes)
            : existing.frequencyMinutes,
        totalDistanceKm: updates.totalDistanceKm ?? existing.totalDistanceKm,
        stops: updatedStops,
        active:
          updates.active !== undefined ? Boolean(updates.active) : existing.active,
      })
      .where(eq(routes.id, Number(id)))
      .returning();

    await db.insert(notifications).values({
      type: "route_change",
      title: `Route ${updatedRoute.routeNumber} Schedule / Stops Updated`,
      message: `Transport Admin updated ${updatedRoute.routeNumber} (${updatedRoute.stops.length} stops, every ${updatedRoute.frequencyMinutes} mins).`,
      routeNumber: updatedRoute.routeNumber,
      severity: "info",
      isRead: false,
    });

    return NextResponse.json({ route: updatedRoute });
  } catch (error) {
    console.error("Failed to update route:", error);
    return NextResponse.json(
      { error: "Failed to update route." },
      { status: 500 }
    );
  }
}

async function deleteRoute(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Route ID is required." },
        { status: 400 }
      );
    }

    await db.delete(routes).where(eq(routes.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete route:", error);
    return NextResponse.json(
      { error: "Failed to delete route." },
      { status: 500 }
    );
  }
}

export const POST = withSession(createRoute, "admin");

export const PATCH = withSession(updateRoute, "admin");

export const DELETE = withSession(deleteRoute, "admin");
