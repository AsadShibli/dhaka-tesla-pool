"use client";

import { Icon } from "../../components/Icons";
import { Card, Loading } from "../../components/ui";
import { BASE_POISHA, POISHA_PER_100M, POOL_PERCENT } from "domain/fare.js";
import { MAX_DROP_GAP_METERS } from "domain/match.js";
import { kilometers, taka } from "../../lib/format";
import { dropGapMeters, quote } from "../../lib/quote";
import { useAreas } from "../../lib/useAreas";

// The fare rule written out with Nusrat and Rafiq's numbers, so anyone can check it by hand.
function Worked({ who, fare }) {
  const billed = Math.round(fare.meters / 100) * 100;
  const charge = (billed / 100) * POISHA_PER_100M;
  const subtotal = BASE_POISHA + charge;
  const discount = subtotal - fare.pooled;
  return (
    <div className="calc">{`${who}
distance        = ${fare.meters} m  → billed ${billed} m
distanceCharge  = ${billed / 100} × ${POISHA_PER_100M} = ${charge} poisha
subtotal        = ${BASE_POISHA} + ${charge} = ${subtotal} poisha   (${taka(subtotal)} solo)
poolDiscount    = round(${subtotal} × ${POOL_PERCENT}%) = ${discount} poisha
shared fare     = ${subtotal} − ${discount} = ${fare.pooled} poisha   (${taka(fare.pooled)})`}</div>
  );
}

export default function FaresPage() {
  const { byCode } = useAreas();
  const nusrat = quote(byCode, "banani", "mohakhali");
  const rafiq = quote(byCode, "banani", "gulshan-1");
  const gap = dropGapMeters(byCode, { destinationCode: "mohakhali" }, { destinationCode: "gulshan-1" });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Fare rules</h1>
          <p>passengerFare = baseFare + distanceCharge − poolDiscount, in whole poisha.</p>
        </div>
      </div>

      <div className="grid-1-1">
        <Card title="The rules" subtitle="Same code runs in the API and on this page">
          <ul className="rule-list">
            <li>
              <span className="stat-icon tone-blue"><Icon.Tag /></span>
              <div><strong>Base fare {taka(BASE_POISHA)}</strong><p>Every ride starts at {BASE_POISHA} poisha.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-green"><Icon.Route /></span>
              <div><strong>{taka(POISHA_PER_100M)} per 100 m</strong><p>Straight-line distance between area centers, rounded to the nearest 100 m.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-orange"><Icon.Users /></span>
              <div><strong>{POOL_PERCENT}% off when shared</strong><p>Rounded half-up to a whole poisha. If your co-rider cancels, you go back to the solo fare.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-purple"><Icon.Pin /></span>
              <div><strong>Share only if it makes sense</strong><p>Same pickup area, and drop-offs at most {kilometers(MAX_DROP_GAP_METERS)} apart.</p></div>
            </li>
            <li>
              <span className="stat-icon tone-red"><Icon.Shield /></span>
              <div><strong>Money is integer poisha</strong><p>100 poisha = 1 BDT. Integers never drift like floats, and Postgres checks amounts are positive.</p></div>
            </li>
          </ul>
        </Card>

        <Card title="Nusrat and Rafiq, by hand" subtitle={gap ? `Mohakhali and Gulshan 1 are ${kilometers(gap)} apart, so they can share Bullet` : "Worked example"}>
          {nusrat && rafiq ? (
            <div className="stack" style={{ gap: 16 }}>
              <Worked who="Nusrat · Banani → Mohakhali" fare={nusrat} />
              <Worked who="Rafiq · Banani → Gulshan 1" fare={rafiq} />
            </div>
          ) : <Loading rows={6} />}
        </Card>
      </div>
    </>
  );
}
