"use client";

import { SessionProvider } from "../components/Session";
import { Shell } from "../components/Shell";

// Every signed-in page shares the sidebar and top bar. /login sits outside this group.
export default function AppLayout({ children }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
