"use client";

import { DriverDashboard } from "../components/driver/DriverDashboard";
import { PassengerDashboard } from "../components/passenger/PassengerDashboard";
import { useSession } from "../components/Session";

// One address for both roles. The sidebar and this page follow the signed-in role.
export default function DashboardPage() {
  const { user } = useSession();
  return user.role === "driver" ? <DriverDashboard /> : <PassengerDashboard />;
}
