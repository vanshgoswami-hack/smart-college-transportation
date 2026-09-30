import { withSession } from "@/lib/session";
import type { UserProfile } from "@/types/transit";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { issues, notifications } from "@/db/schema";
import { ensureDatabaseSeeded } from "@/lib/db-init";
import { eq } from "drizzle-orm";

async function createIssue(req: NextRequest, user: UserProfile) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const {
      busCode = "PS-01",
      routeNumber = "R-101",
      stopName = "North Gate Metro Plaza",
      category,
      severity = "Medium",
      description,
    } = body;

    if (!category || !description) {
      return NextResponse.json(
        { error: "Issue category and description are required." },
        { status: 400 }
      );
    }

    const [createdIssue] = await db
      .insert(issues)
      .values({
        reportedByUserId: user.id,
        studentName: user.name,
        studentId: user.studentId || `STU-${user.id}`,
        busCode: String(busCode).trim(),
        routeNumber: String(routeNumber).trim(),
        stopName: String(stopName).trim(),
        category: String(category).trim(),
        severity: String(severity).trim(),
        description: String(description).trim(),
        status: "Open",
      })
      .returning();

    // Also add a live notification so students & dispatchers see the field report
    const notifType =
      category === "Bus overcrowded"
        ? "crowded"
        : category === "Bus delayed"
        ? "delay"
        : "route_change";

    await db.insert(notifications).values({
      type: notifType,
      title: `Student Report: ${category} on ${routeNumber} (${busCode})`,
      message: `A student reported ${category} at ${stopName}. Transport staff have been notified.`,
      routeNumber,
      busCode,
      severity:
        category === "Bus overcrowded" || category === "Bus missing"
          ? "critical"
          : "warning",
      isRead: false,
    });

    return NextResponse.json({ issue: createdIssue }, { status: 201 });
  } catch (error) {
    console.error("Failed to submit issue:", error);
    return NextResponse.json(
      { error: "Failed to submit transport report." },
      { status: 500 }
    );
  }
}

async function updateIssue(req: NextRequest) {
  try {
    await ensureDatabaseSeeded();
    const body = await req.json();
    const { id, status, adminNote } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Issue ID is required." },
        { status: 400 }
      );
    }

    const [updatedIssue] = await db
      .update(issues)
      .set({
        ...(status ? { status } : {}),
        ...(adminNote !== undefined ? { adminNote } : {}),
      })
      .where(eq(issues.id, Number(id)))
      .returning();

    return NextResponse.json({ issue: updatedIssue });
  } catch (error) {
    console.error("Failed to update issue:", error);
    return NextResponse.json(
      { error: "Failed to update issue." },
      { status: 500 }
    );
  }
}

export const POST = withSession(createIssue);
export const PATCH = withSession(updateIssue, "admin");
