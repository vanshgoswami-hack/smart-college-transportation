import { db } from "@/db";
import { routes, buses, notifications, issues, users } from "@/db/schema";
import { INITIAL_ROUTES, INITIAL_BUSES, INITIAL_NOTIFICATIONS, INITIAL_ISSUES } from "@/lib/seed-data";
import { hashPassword } from "@/lib/password";
import { and, count, eq, isNull, sql } from "drizzle-orm";

let initialization: Promise<void> | undefined;

// Schema changes are applied using drizzle-kit push, not runtime raw SQL.
// A shared promise and transaction lock prevent partial or racing seed inserts.
export function ensureDatabaseSeeded(): Promise<void> {
  if (!initialization) {
    initialization = seedDatabase().catch((error) => {
      initialization = undefined;
      throw error;
    });
  }
  return initialization;
}

async function seedDatabase() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(74921843)`);

    const [{ value: routeCount }] = await tx.select({ value: count() }).from(routes);
    if (routeCount === 0) {
      await tx.insert(routes).values(INITIAL_ROUTES).onConflictDoNothing();
    }

    const allRoutes = await tx.select().from(routes);
    const routeIds = new Map(allRoutes.map((route) => [route.routeNumber, route.id]));
    const [{ value: busCount }] = await tx.select({ value: count() }).from(buses);
    if (busCount === 0) {
      const seedBuses = INITIAL_BUSES.filter((bus) => routeIds.has(bus.routeNumber)).map((bus) => ({
        ...bus,
        routeId: routeIds.get(bus.routeNumber)!,
      }));
      if (seedBuses.length) await tx.insert(buses).values(seedBuses).onConflictDoNothing();
    }

    const [{ value: notificationCount }] = await tx.select({ value: count() }).from(notifications);
    if (notificationCount === 0) await tx.insert(notifications).values(INITIAL_NOTIFICATIONS);
    const [{ value: issueCount }] = await tx.select({ value: count() }).from(issues);
    if (issueCount === 0) await tx.insert(issues).values(INITIAL_ISSUES);

    // These identities are explicitly public demonstration accounts, not passwords.
    const demoUsers = [
      {
        name: "Aiden Chen",
        email: "aiden.chen@powerstone.edu",
        role: "student",
        isDemo: true,
        studentId: "STU-2026-8491",
        department: "Computer Science & Robotics",
        assignedStop: "North Gate Metro Plaza",
        preferredRoute: "R-101",
      },
      {
        name: "Capt. Evelyn Vance",
        email: "admin@powerstone.edu",
        role: "admin",
        isDemo: true,
        studentId: "ADM-FLEET-01",
        department: "Campus Transit Command",
        assignedStop: "Central Library & Student Union",
        preferredRoute: "R-101",
      },
    ];
    await tx.insert(users).values(demoUsers).onConflictDoNothing({ target: users.email });

    // Upgrade only the original passwordless sample accounts; never overwrite real credentials.
    for (const demoUser of demoUsers) {
      await tx.update(users).set({ isDemo: true }).where(and(
        eq(users.email, demoUser.email),
        eq(users.role, demoUser.role),
        isNull(users.passwordHash),
      ));
    }

    // Optional staff account provisioning. No admin passwords are shipped in source.
    const adminEmail = process.env.POWER_STONE_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.POWER_STONE_ADMIN_PASSWORD;
    if (adminEmail && adminPassword && adminPassword.length >= 8 && adminPassword.length <= 128) {
      const [existingAdmin] = await tx.select({ id: users.id }).from(users).where(eq(users.email, adminEmail)).limit(1);
      if (!existingAdmin) {
        await tx.insert(users).values({
          name: "Transport Administrator",
          email: adminEmail,
          passwordHash: await hashPassword(adminPassword),
          role: "admin",
          isDemo: false,
          studentId: "ADM-STAFF",
          department: "Campus Transit Operations",
        }).onConflictDoNothing({ target: users.email });
      }
    }
  });
}
