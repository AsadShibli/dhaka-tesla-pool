"use client";

import { PassengerDashboard } from "../components/passenger/PassengerDashboard";
import { useSession } from "../components/Session";

// One address for both roles. The sidebar and this page follow the signed-in role.
export default function DashboardPage() {
  const { user } = useSession();
  if (user.role === "driver") return <p className="muted">The driver dashboard is next.</p>;
  return <PassengerDashboard />;
}
