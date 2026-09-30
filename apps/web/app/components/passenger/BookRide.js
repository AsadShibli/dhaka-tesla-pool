"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "../Icons";
import { FareChart } from "../FareChart";
import { Card, Loading, Notice } from "../ui";
import { api, announceChange, errorText } from "../../lib/api";
import { kilometers, taka } from "../../lib/format";
import { quote } from "../../lib/quote";
import { useAreas } from "../../lib/useAreas";

// Pickup, destination, seats. The estimate is the solo fare; sharing takes 15% off later.
export function BookRide() {
  const { areas, byCode, nameOf, error: areaError } = useAreas();
  const [pickup, setPickup] = useState("banani");
  const [destination, setDestination] = useState("mohakhali");
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);

  // If the list loads without Banani, fall back to the first two areas.
  useEffect(() => {
    if (areas.length && !byCode[pickup]) setPickup(areas[0].code);
    if (areas.length > 1 && !byCode[destination]) setDestination(areas[1].code);
  }, [areas]); // eslint-disable-line react-hooks/exhaustive-deps

  const fare = quote(byCode, pickup, destination);
  const same = pickup === destination;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setBooked(null);
    const result = await api("/rides", { method: "POST", body: { pickupCode: pickup, destinationCode: destination, seats } });
    setBusy(false);
    if (!result.ok) {
      setError(errorText(result, "Could not request the ride"));
      return;
    }
    setBooked(result.body);
    announceChange();
  }

  function preset(from, to) {
    setPickup(from);
    setDestination(to);
    setSeats(1);
  }

  return (
    <>
      <div className="grid-2-1">
        <Card
          title="Book a ride"
          subtitle="Pick two Dhaka areas. Bullet seats three."
          action={(
            <div className="row-actions">
              <button type="button" className="btn btn-light btn-sm" onClick={() => preset("banani", "mohakhali")}>Nusrat&apos;s trip</button>
              <button type="button" className="btn btn-light btn-sm" onClick={() => preset("banani", "gulshan-1")}>Rafiq&apos;s trip</button>
            </div>
          )}
        >
          <Notice>{areaError}</Notice>
          {areas.length === 0 && !areaError ? <Loading rows={3} /> : (
            <form onSubmit={submit}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="pickup">Pickup</label>
                  <select id="pickup" className="select" value={pickup} onChange={(e) => setPickup(e.target.value)}>
                    {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="destination">Destination</label>
                  <select id="destination" className="select" value={destination} onChange={(e) => setDestination(e.target.value)}>
                    {areas.map((area) => <option key={area.code} value={area.code}>{area.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="seats">Seats</label>
                  <select id="seats" className="select" value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
                    <option value={1}>1 seat</option>
                    <option value={2}>2 seats</option>
                    <option value={3}>3 seats (whole Tesla)</option>
                  </select>
                </div>
              </div>

              {same ? <Notice>Pickup and destination must be different areas.</Notice> : null}
              {fare ? (
                <div className="quote">
                  <div><span>Distance</span><strong>{kilometers(fare.meters)}</strong></div>
                  <div><span>Estimate (solo)</span><strong>{taka(fare.solo)}</strong></div>
                  <div><span>If shared</span><strong className="good">{taka(fare.pooled)}</strong></div>
                </div>
              ) : null}

              <Notice>{error}</Notice>
              {booked ? (
                <Notice kind="success">
                  Requested {nameOf(booked.pickupCode)} → {nameOf(booked.destinationCode)} for {booked.seats} seat{booked.seats > 1 ? "s" : ""}.
                  {" "}Estimate {taka(booked.farePoisha)}. <Link href="/" style={{ textDecoration: "underline" }}>Track it on the dashboard</Link>.
                </Notice>
              ) : null}

              <button type="submit" className="btn btn-primary btn-block" disabled={busy || same || !fare}>
                <Icon.Car /> {busy ? "Requesting…" : `Request ${seats} seat${seats > 1 ? "s" : ""}`}
              </button>
            </form>
          )}
        </Card>

        <Card title="How sharing works" subtitle="Applied the same way to every request">
          <ul className="rule-list">
            <li>
              <span className="stat-icon tone-blue"><Icon.Pin /></span>
              <div><strong>Same pickup area</strong><p>Both riders start in the same area, e.g. Banani.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-green"><Icon.Route /></span>
              <div><strong>Drop-offs within 2 km</strong><p>Mohakhali and Gulshan 1 are 1.96 km apart, so Nusrat and Rafiq can share.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-orange"><Icon.Seat /></span>
              <div><strong>Seats never exceed 3</strong><p>The last seat goes to whoever the database commits first.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-red"><Icon.Tag /></span>
              <div><strong>15% off each shared fare</strong><p>Each rider pays for their own distance, minus the discount.</p></div>
            </li>
          </ul>
        </Card>
      </div>

      {areas.length ? (
        <Card title="Fares from here" subtitle={`Solo and shared fare from ${nameOf(pickup)} to every area`}>
          <FareChart areas={areas} byCode={byCode} pickupCode={pickup} destinationCode={destination} />
        </Card>
      ) : null}
    </>
  );
}
