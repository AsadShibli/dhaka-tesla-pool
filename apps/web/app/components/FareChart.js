"use client";

import { quote } from "../lib/quote";
import { taka } from "../lib/format";

// Solo and pooled fare from one pickup to every other area, nearest first.
// Two smooth areas, like the sales chart in the dashboard mock-up.
const W = 720;
const H = 300;
const PAD = { top: 20, right: 20, bottom: 40, left: 56 };

function smooth(points) {
  if (points.length < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mid = (x0 + x1) / 2;
    d += ` C${mid},${y0} ${mid},${y1} ${x1},${y1}`;
  }
  return d;
}

export function FareChart({ areas, byCode, pickupCode, destinationCode }) {
  const rows = areas
    .filter((area) => area.code !== pickupCode)
    .map((area) => ({ area, fare: quote(byCode, pickupCode, area.code) }))
    .filter((row) => row.fare)
    .sort((a, b) => a.fare.meters - b.fare.meters);
  if (rows.length < 2) return null;

  const max = Math.ceil(Math.max(...rows.map((row) => row.fare.solo)) / 5000) * 5000;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (index) => PAD.left + (index * innerW) / (rows.length - 1);
  const y = (poisha) => PAD.top + innerH - (poisha / max) * innerH;
  const solo = rows.map((row, index) => [x(index), y(row.fare.solo)]);
  const pooled = rows.map((row, index) => [x(index), y(row.fare.pooled)]);
  const base = PAD.top + innerH;
  const area = (points) => `${smooth(points)} L${points.at(-1)[0]},${base} L${points[0][0]},${base} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((step) => Math.round(max * step));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Fares from ${byCode[pickupCode]?.name}`}>
        <defs>
          <linearGradient id="soloFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#398bf7" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#398bf7" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="poolFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#06d79c" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06d79c" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid-line" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
            <text className="axis" x={PAD.left - 10} y={y(tick) + 4} textAnchor="end">৳{tick / 100}</text>
          </g>
        ))}
        <path d={area(solo)} fill="url(#soloFill)" stroke="#398bf7" strokeWidth="2" />
        <path d={area(pooled)} fill="url(#poolFill)" stroke="#06d79c" strokeWidth="2" />
        {rows.map((row, index) => {
          const picked = row.area.code === destinationCode;
          return (
            <g key={row.area.code}>
              <circle cx={x(index)} cy={y(row.fare.solo)} r={picked ? 6 : 3.5} fill="#fff" stroke="#398bf7" strokeWidth="2">
                <title>{`${row.area.name}: solo ${taka(row.fare.solo)}, pooled ${taka(row.fare.pooled)}`}</title>
              </circle>
              <text className="axis" x={x(index)} y={H - 14} textAnchor="middle"
                style={picked ? { fill: "#2962ff", fontWeight: 700 } : undefined}>
                {row.area.name}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span><i style={{ background: "#398bf7" }} />Solo fare</span>
        <span><i style={{ background: "#06d79c" }} />Pooled fare (15% off)</span>
      </div>
    </div>
  );
}
