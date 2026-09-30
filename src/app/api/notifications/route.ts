import { withSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import { eq } from "drizzle-orm";

async function createNotification(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const {
      type = "arriving_soon",
      title,
      message,
      routeNumber = "R-101",
      busCode = "PS-01",
      severity = "info",
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required." },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(notifications)
      .values({
        type,
        title: String(title).trim(),
        message: String(message).trim(),
        routeNumber: String(routeNumber).trim(),
        busCode: busCode ? String(busCode).trim() : null,
        severity,
        isRead: false,
      })
      .returning();

    return NextResponse.json({ notification: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to create notification:", error);
    return NextResponse.json(
      { error: "Failed to broadcast notification." },
      { status: 500 }
    );
  }
}

async function readNotification(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const { id, markAllRead } = body;

    if (markAllRead) {
      await db.update(notifications).set({ isRead: true });
      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Notification ID is required." },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, Number(id)))
      .returning();

    return NextResponse.json({ notification: updated });
  } catch (error) {
    console.error("Failed to mark notification read:", error);
    return NextResponse.json(
      { error: "Failed to update notification." },
      { status: 500 }
    );
  }
}

export const POST = withSession(createNotification, "admin");

export const PATCH = withSession(readNotification);
