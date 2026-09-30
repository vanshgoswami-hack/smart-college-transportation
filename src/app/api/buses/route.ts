import { withSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { buses, routes, notifications } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import { eq } from "drizzle-orm";

async function createBus(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();

    const {
      busCode,
      plateNumber,
      routeNumber,
      driverName,
      driverPhone,
      capacity = 50,
      occupancy = 15,
      status = "On Time",
      delayMinutes = 0,
      etaMinutes = 5,
    } = body;

    if (!busCode || !plateNumber || !routeNumber || !driverName) {
      return NextResponse.json(
        { error: "Bus code, plate number, route, and driver name are required." },
        { status: 400 }
      );
    }

    const matchedRoutes = await db
      .select()
      .from(routes)
      .where(eq(routes.routeNumber, routeNumber));
    const route = matchedRoutes[0];
    const stops = route?.stops ?? [];
    const firstStop = stops[0]?.name ?? "Campus Main Gate";
    const secondStop = stops[1]?.name ?? "Central Library & Student Union";

    const [createdBus] = await db
      .insert(buses)
      .values({
        busCode: String(busCode).trim().toUpperCase(),
        plateNumber: String(plateNumber).trim().toUpperCase(),
        routeId: route?.id ?? 1,
        routeNumber,
        driverName: String(driverName).trim(),
        driverPhone: String(driverPhone || "+1 (555) 400-1000").trim(),
        capacity: Number(capacity) || 50,
        occupancy: Number(occupancy) || 15,
        status,
        delayMinutes: Number(delayMinutes) || 0,
        currentStopIndex: 0,
        currentLocation: firstStop,
        nextStop: secondStop,
        etaMinutes: Number(etaMinutes) || 5,
        speedKmh: 36,
        mapX: stops[0]?.x ?? 300,
        mapY: stops[0]?.y ?? 250,
        heading: `Inbound on ${routeNumber}`,
      })
      .returning();

    await db.insert(notifications).values({
      type: "arriving_soon",
      title: `New Shuttle ${createdBus.busCode} Deployed on ${createdBus.routeNumber}`,
      message: `Shuttle ${createdBus.busCode} (${createdBus.capacity} seats) has entered active service at ${createdBus.currentLocation}.`,
      routeNumber: createdBus.routeNumber,
      busCode: createdBus.busCode,
      severity: "info",
      isRead: false,
    });

    return NextResponse.json({ bus: createdBus }, { status: 201 });
  } catch (error) {
    console.error("Failed to create bus:", error);
    return NextResponse.json(
      { error: "Failed to add bus. Bus code may already exist." },
      { status: 500 }
    );
  }
}

async function updateBus(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const { id, advanceStop, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Bus ID is required." }, { status: 400 });
    }

    const existingList = await db
      .select()
      .from(buses)
      .where(eq(buses.id, Number(id)));
    const existing = existingList[0];
    if (!existing) {
      return NextResponse.json({ error: "Bus not found." }, { status: 404 });
    }

    const matchedRoutes = await db
      .select()
      .from(routes)
      .where(eq(routes.routeNumber, updates.routeNumber || existing.routeNumber));
    const route = matchedRoutes[0];
    const stops = route?.stops ?? [];

    let nextStopIndex = existing.currentStopIndex;
    let currentLocation = updates.currentLocation ?? existing.currentLocation;
    let nextStop = updates.nextStop ?? existing.nextStop;
    let mapX = existing.mapX;
    let mapY = existing.mapY;

    if (advanceStop && stops.length >= 2) {
      nextStopIndex = (existing.currentStopIndex + 1) % stops.length;
      const followingIndex = (nextStopIndex + 1) % stops.length;
      currentLocation = stops[nextStopIndex].name;
      nextStop = stops[followingIndex].name;
      mapX = stops[nextStopIndex].x;
      mapY = stops[nextStopIndex].y;
    } else if (updates.routeNumber && updates.routeNumber !== existing.routeNumber && stops.length >= 2) {
      nextStopIndex = 0;
      currentLocation = stops[0].name;
      nextStop = stops[1].name;
      mapX = stops[0].x;
      mapY = stops[0].y;
    }

    const capacity =
      updates.capacity !== undefined ? Number(updates.capacity) : existing.capacity;
    const occupancy =
      updates.occupancy !== undefined
        ? Math.max(0, Math.min(capacity, Number(updates.occupancy)))
        : existing.occupancy;

    let status = updates.status ?? existing.status;
    let delayMinutes =
      updates.delayMinutes !== undefined
        ? Number(updates.delayMinutes)
        : existing.delayMinutes;

    if (status === "Full" && updates.occupancy === undefined) {
      // If admin explicitly set status to Full, ensure occupancy reflects it
    } else if (occupancy >= capacity) {
      status = "Full";
    }

    if (status === "On Time" && updates.delayMinutes === undefined) {
      delayMinutes = 0;
    } else if (status === "Delayed" && delayMinutes === 0) {
      delayMinutes = 6;
    }

    const [updatedBus] = await db
      .update(buses)
      .set({
        busCode: updates.busCode ?? existing.busCode,
        plateNumber: updates.plateNumber ?? existing.plateNumber,
        routeNumber: updates.routeNumber ?? existing.routeNumber,
        routeId: route?.id ?? existing.routeId,
        driverName: updates.driverName ?? existing.driverName,
        driverPhone: updates.driverPhone ?? existing.driverPhone,
        capacity,
        occupancy,
        status,
        delayMinutes,
        currentStopIndex: nextStopIndex,
        currentLocation,
        nextStop,
        etaMinutes:
          updates.etaMinutes !== undefined
            ? Number(updates.etaMinutes)
            : existing.etaMinutes,
        mapX,
        mapY,
        lastUpdated: new Date(),
      })
      .where(eq(buses.id, Number(id)))
      .returning();

    // Generate smart student notification if status changed meaningfully
    if (status !== existing.status) {
      if (status === "Delayed") {
        await db.insert(notifications).values({
          type: "delay",
          title: `Delay Alert: Bus ${updatedBus.busCode} (${updatedBus.routeNumber})`,
          message: `Bus ${updatedBus.busCode} near ${updatedBus.currentLocation} is delayed by ~${updatedBus.delayMinutes} mins. Adjusted ETA to ${updatedBus.nextStop}: ${updatedBus.etaMinutes} mins.`,
          routeNumber: updatedBus.routeNumber,
          busCode: updatedBus.busCode,
          severity: "warning",
          isRead: false,
        });
      } else if (status === "Full") {
        await db.insert(notifications).values({
          type: "crowded",
          title: `Capacity Alert: Bus ${updatedBus.busCode} is Full`,
          message: `Bus ${updatedBus.busCode} on ${updatedBus.routeNumber} has reached 100% capacity (${updatedBus.occupancy}/${updatedBus.capacity} seats). Consider next shuttle.`,
          routeNumber: updatedBus.routeNumber,
          busCode: updatedBus.busCode,
          severity: "critical",
          isRead: false,
        });
      } else if (status === "On Time") {
        await db.insert(notifications).values({
          type: "arriving_soon",
          title: `Bus ${updatedBus.busCode} Resumed On-Time Schedule`,
          message: `Bus ${updatedBus.busCode} on ${updatedBus.routeNumber} is now running on time approaching ${updatedBus.nextStop}.`,
          routeNumber: updatedBus.routeNumber,
          busCode: updatedBus.busCode,
          severity: "info",
          isRead: false,
        });
      }
    }

    return NextResponse.json({ bus: updatedBus });
  } catch (error) {
    console.error("Failed to update bus:", error);
    return NextResponse.json(
      { error: "Failed to update bus." },
      { status: 500 }
    );
  }
}

async function deleteBus(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Bus ID is required." }, { status: 400 });
    }

    await db.delete(buses).where(eq(buses.id, Number(id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete bus:", error);
    return NextResponse.json(
      { error: "Failed to delete bus." },
      { status: 500 }
    );
  }
}

export const POST = withSession(createBus, "admin");

export const PATCH = withSession(updateBus, "admin");

export const DELETE = withSession(deleteBus, "admin");
