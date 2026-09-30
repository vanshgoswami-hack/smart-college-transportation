import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export interface RouteStopItem {
  id: string;
  name: string;
  code: string;
  sequence: number;
  etaOffsetMinutes: number;
  x: number; // SVG map coordinate X (0-1000)
  y: number; // SVG map coordinate Y (0-600)
  landmark: string;
  waitingStudents: number;
}

export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  routeNumber: text("route_number").notNull().unique(),
  name: text("name").notNull(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  color: text("color").notNull().default("#4F46E5"),
  frequencyMinutes: integer("frequency_minutes").notNull().default(15),
  totalDistanceKm: text("total_distance_km").notNull().default("12.4"),
  stops: jsonb("stops").$type<RouteStopItem[]>().notNull().default([]),
  peakDemandScore: integer("peak_demand_score").notNull().default(82),
  avgDelayMinutes: integer("avg_delay_minutes").notNull().default(3),
  crowdingFrequencyPct: integer("crowding_frequency_pct").notNull().default(45),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buses = pgTable("buses", {
  id: serial("id").primaryKey(),
  busCode: text("bus_code").notNull().unique(),
  plateNumber: text("plate_number").notNull(),
  routeId: integer("route_id").notNull(),
  routeNumber: text("route_number").notNull(),
  driverName: text("driver_name").notNull(),
  driverPhone: text("driver_phone").notNull(),
  capacity: integer("capacity").notNull().default(50),
  occupancy: integer("occupancy").notNull().default(25),
  status: text("status").notNull().default("On Time"), // "On Time" | "Delayed" | "Full"
  delayMinutes: integer("delay_minutes").notNull().default(0),
  currentStopIndex: integer("current_stop_index").notNull().default(0),
  currentLocation: text("current_location").notNull(),
  nextStop: text("next_stop").notNull(),
  etaMinutes: integer("eta_minutes").notNull().default(5),
  speedKmh: integer("speed_kmh").notNull().default(34),
  mapX: integer("map_x").notNull().default(250),
  mapY: integer("map_y").notNull().default(300),
  heading: text("heading").notNull().default("Inbound to Main Campus"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "arriving_soon" | "delay" | "route_change" | "crowded"
  title: text("title").notNull(),
  message: text("message").notNull(),
  routeNumber: text("route_number").notNull(),
  busCode: text("bus_code"),
  severity: text("severity").notNull().default("info"), // "info" | "warning" | "critical" | "success"
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  reportedByUserId: integer("reported_by_user_id").references(() => users.id, { onDelete: "set null" }),
  studentName: text("student_name").notNull(),
  studentId: text("student_id").notNull(),
  busCode: text("bus_code").notNull(),
  routeNumber: text("route_number").notNull(),
  stopName: text("stop_name").notNull(),
  category: text("category").notNull(), // "Bus overcrowded" | "Bus delayed" | "Bus missing" | "Other transport issue"
  severity: text("severity").notNull().default("Medium"), // "Low" | "Medium" | "High" | "Critical"
  description: text("description").notNull(),
  status: text("status").notNull().default("Open"), // "Open" | "Investigating" | "Resolved"
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  isDemo: boolean("is_demo").notNull().default(false),
  role: text("role").notNull().default("student"), // "student" | "admin"
  studentId: text("student_id"),
  department: text("department"),
  assignedStop: text("assigned_stop").default("North Gate Metro Plaza"),
  preferredRoute: text("preferred_route").default("R-101"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("auth_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
