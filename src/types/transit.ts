import type { RouteStopItem } from "@/db/schema";

export type AppView =
  | "landing"
  | "student-login"
  | "student-dashboard"
  | "live-tracking"
  | "routes-stops"
  | "notifications"
  | "report-issue"
  | "admin-login"
  | "admin-dashboard"
  | "bus-management"
  | "route-management"
  | "analytics";

export interface RouteData {
  id: number;
  routeNumber: string;
  name: string;
  origin: string;
  destination: string;
  color: string;
  frequencyMinutes: number;
  totalDistanceKm: string;
  stops: RouteStopItem[];
  peakDemandScore: number;
  avgDelayMinutes: number;
  crowdingFrequencyPct: number;
  active: boolean;
}

export interface BusData {
  id: number;
  busCode: string;
  plateNumber: string;
  routeId: number;
  routeNumber: string;
  driverName: string;
  driverPhone: string;
  capacity: number;
  occupancy: number;
  status: "On Time" | "Delayed" | "Full" | string;
  delayMinutes: number;
  currentStopIndex: number;
  currentLocation: string;
  nextStop: string;
  etaMinutes: number;
  speedKmh: number;
  mapX: number;
  mapY: number;
  heading: string;
  lastUpdated?: string;
}

export interface NotificationData {
  id: number;
  type: "arriving_soon" | "delay" | "route_change" | "crowded" | string;
  title: string;
  message: string;
  routeNumber: string;
  busCode?: string | null;
  severity: "info" | "warning" | "critical" | "success" | string;
  isRead: boolean;
  createdAt: string;
}

export interface IssueData {
  id: number;
  studentName: string;
  studentId: string;
  busCode: string;
  routeNumber: string;
  stopName: string;
  category: string;
  severity: string;
  description: string;
  status: "Open" | "Investigating" | "Resolved" | string;
  adminNote?: string | null;
  createdAt: string;
}

export interface UserProfile {
  id?: number;
  isDemo?: boolean;
  name: string;
  email: string;
  role: "student" | "admin";
  studentId?: string;
  department?: string;
  assignedStop?: string;
  preferredRoute?: string;
}
