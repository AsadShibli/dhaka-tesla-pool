"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import { Notifier } from "./Notifier";
import { useSession } from "./Session";
import { usePoll } from "../lib/usePoll";
import { initials, taka } from "../lib/format";

// A passenger books and pays. A driver runs Bullet. Each sees only their own pages.
const NAV = {
  passenger: [
    { href: "/", label: "Dashboard", icon: Icon.Gauge },
    { href: "/book", label: "Book a ride", icon: Icon.Plus },
    { href: "/history", label: "Ride history", icon: Icon.Clock },
    { href: "/fares", label: "Fare rules", icon: Icon.Tag },
  ],
  driver: [
    { href: "/", label: "Dashboard", icon: Icon.Gauge },
    { href: "/history", label: "Trip history", icon: Icon.Clock },
    { href: "/fares", label: "Fare rules", icon: Icon.Tag },
  ],
};

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><Icon.Bolt width="20" height="20" /></span>
      <div>
        tesla pool
        <small>Dhaka · share a seat</small>
      </div>
    </div>
  );
}

export function Shell({ children }) {
  const { user, signOut } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const health = usePoll("/health", 10000);
  const apiUp = health.data?.ok === true;
  const links = NAV[user.role] ?? NAV.passenger;

  // Close the drawer and menu after moving to another page.
  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  return (
    <div className={`shell ${open ? "open" : ""}`}>
      <aside className="sidebar">
        <Brand />
        <ul className="nav">
          <li className="nav-label">{user.role === "driver" ? "Driver" : "Passenger"}</li>
          {links.map(({ href, label, icon: Shape }) => (
            <li key={href}>
              <Link href={href} className={pathname === href ? "active" : ""}>
                <Shape />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-foot">
          {user.role === "passenger" ? (
            <div className="wallet-chip">
              <div className="stat-icon tone-blue" style={{ width: 42, height: 42 }}><Icon.Wallet width="20" height="20" /></div>
              <div>
                <strong>{taka(user.balancePoisha)}</strong>
                <span>TeslaPay balance</span>
              </div>
            </div>
          ) : null}
          <Link href="/fares" className="btn btn-dark btn-block">How fares work</Link>
          <button type="button" className="btn btn-danger btn-block" onClick={signOut}>
            <Icon.Logout /> Sign out
          </button>
        </div>
      </aside>
      <div className="overlay" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="topbar">
          <div className="topbar-links">
            {links.slice(0, 3).map(({ href, label }) => (
              <Link key={href} href={href} className={pathname === href ? "active" : ""}>{label}</Link>
            ))}
          </div>
          <button type="button" className="menu-btn" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Icon.Menu width="24" height="24" />
          </button>
          <div className="topbar-right">
            <span className={`api-pill ${apiUp ? "" : "down"}`} title="Express API health">
              <i /> <span>API {health.loading ? "…" : apiUp ? "online" : "down"}</span>
            </span>
            <div className="user-menu">
              <button type="button" onClick={() => setMenu((value) => !value)} aria-expanded={menu}>
                <span className="who">
                  {user.name}
                  <small>{user.role}</small>
                </span>
                <span className="avatar">{initials(user.name)}</span>
              </button>
              {menu ? (
                <div className="dropdown">
                  <p>{user.email}</p>
                  <button type="button" onClick={signOut}><Icon.Logout width="16" height="16" /> Sign out</button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
      <Notifier />
    </div>
  );
}
