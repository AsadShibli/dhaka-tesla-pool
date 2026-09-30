"use client";

import { Icon } from "../../components/Icons";
import { RidesTable } from "../../components/passenger/RidesTable";
import { useSession } from "../../components/Session";
import { Card, Empty, Loading, Notice, StatusBadge } from "../../components/ui";
import { taka } from "../../lib/format";
import { useAreas } from "../../lib/useAreas";
import { usePoll } from "../../lib/usePoll";

// Finished trips only: completed or cancelled. Each person sees their own.
export default function HistoryPage() {
  const { user } = useSession();
  const { nameOf } = useAreas();
  const { data, error, loading } = usePoll("/rides/history", 5000);
  const rows = data ?? [];
  const driver = user.role === "driver";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{driver ? "Trip history" : "Ride history"}</h1>
          <p>{driver ? "Every pool Bullet finished or lost to cancellation." : "Your completed and cancelled rides, with what you paid."}</p>
        </div>
      </div>
      <Card title={driver ? "Finished trips" : "Finished rides"} subtitle={`${rows.length} in total`}>
        <Notice>{error}</Notice>
        {loading ? <Loading rows={4} /> : rows.length === 0 ? (
          <Empty icon={Icon.Clock} title="Nothing finished yet">Completed and cancelled trips appear here.</Empty>
        ) : driver ? (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Riders</th><th>Seats</th><th>Status</th><th>Fares collected</th></tr></thead>
              <tbody>
                {rows.map((trip) => (
                  <tr key={trip.id}>
                    <td>{new Date(trip.createdAt).toLocaleString()}</td>
                    <td>{trip.riders}</td>
                    <td>{trip.seatsTaken} / {trip.capacity}</td>
                    <td><StatusBadge status={trip.status} /></td>
                    <td className="money">{trip.status === "completed" ? taka(trip.fareTotalPoisha) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <RidesTable rides={rows} nameOf={nameOf} />
        )}
      </Card>
    </>
  );
}
