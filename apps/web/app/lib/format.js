// Money is stored as whole poisha. 100 poisha = 1 BDT. Only the display divides.
export function taka(poisha) {
  if (typeof poisha !== "number") return "—";
  return `৳${(poisha / 100).toFixed(2)}`;
}

export function kilometers(meters) {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function timeAgo(iso) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  return `${Math.round(hours / 24)} d ago`;
}

export function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

// A stable colour per person, so Nusrat is always the same colour in every table.
const palette = ["#2962ff", "#06d79c", "#fc4b6c", "#ffb22b", "#7460ee", "#26c6da"];
export function colorFor(name = "") {
  let sum = 0;
  for (const char of name) sum += char.charCodeAt(0);
  return palette[sum % palette.length];
}

export const STATUS_TEXT = {
  requested: "Waiting",
  matched: "Matched",
  accepted: "Accepted",
  driver_arrived: "Driver arrived",
  started: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
  paid: "Paid",
};
