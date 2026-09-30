import { Icon } from "./Icons";
import { STATUS_TEXT, colorFor, initials } from "../lib/format";

export function Card({ title, subtitle, action, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {title ? (
        <div className="card-head">
          <div>
            <h2 className="card-title">{title}</h2>
            {subtitle ? <p className="card-sub">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function StatCard({ icon: IconShape, tone, value, label }) {
  return (
    <div className="card stat">
      <div className={`stat-icon tone-${tone}`}><IconShape /></div>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{STATUS_TEXT[status] ?? status}</span>;
}

export function Person({ name, detail }) {
  return (
    <div className="person">
      <span className="avatar" style={{ background: colorFor(name) }}>{initials(name)}</span>
      <div>
        {name}
        {detail ? <small>{detail}</small> : null}
      </div>
    </div>
  );
}

export function Route({ from, to }) {
  return (
    <span className="route">{from}<Icon.Arrow />{to}</span>
  );
}

export function Empty({ icon: IconShape = Icon.Inbox, title, children }) {
  return (
    <div className="empty">
      <IconShape />
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="skeleton" style={{ width: `${90 - index * 15}%` }} />
      ))}
    </div>
  );
}

export function Notice({ kind = "error", children }) {
  if (!children) return null;
  const Shape = kind === "success" ? Icon.CheckCircle : Icon.Alert;
  return (
    <div className={`alert alert-${kind}`} role={kind === "error" ? "alert" : "status"}>
      <Shape />
      <span>{children}</span>
    </div>
  );
}

// requested -> matched -> driver_arrived -> started -> dropped_off -> completed. Cancelled is shown as a badge instead.
const STEPS = [
  ["requested", "Requested"],
  ["matched", "Matched"],
  ["driver_arrived", "Arrived"],
  ["started", "In progress"],
  ["dropped_off", "Payment"],
  ["completed", "Completed"],
];

export function Lifecycle({ status }) {
  const normalized = status === "accepted" ? "matched" : status;
  const at = STEPS.findIndex(([key]) => key === normalized);
  return (
    <ol className="steps">
      {STEPS.map(([key, label], index) => (
        <li key={key} className={`${index <= at ? "done" : ""} ${index === at ? "now" : ""}`}>{label}</li>
      ))}
    </ol>
  );
}

export function Seats({ taken, capacity }) {
  return (
    <div className="seats" aria-label={`${taken} of ${capacity} seats taken`}>
      {Array.from({ length: capacity }, (_, index) => (
        <div key={index} className={`seat ${index < taken ? "taken" : ""}`}>
          {index < taken ? "TAKEN" : "FREE"}
        </div>
      ))}
    </div>
  );
}
