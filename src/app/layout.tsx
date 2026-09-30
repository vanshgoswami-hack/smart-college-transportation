import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Power Stone — Smart College Transportation Management System",
  description:
    "Real-time campus bus tracking, crowd occupancy monitoring, ETA predictions, delay alerts, student issue reporting, and admin fleet analytics.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
