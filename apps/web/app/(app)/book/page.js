"use client";

import { BookRide } from "../../components/passenger/BookRide";
import { useSession } from "../../components/Session";
import { Empty } from "../../components/ui";

export default function BookPage() {
  const { user } = useSession();
  if (user.role !== "passenger") return <div className="card"><Empty title="Passengers only">Drivers accept rides from the dashboard.</Empty></div>;
  return <BookRide />;
}
