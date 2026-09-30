"use client";

import { SessionProvider } from "../components/Session";
import { Shell } from "../components/Shell";
import { ToastProvider } from "../components/Toaster";

// Every signed-in page shares the sidebar, top bar, and pop-up notifications. /login sits outside this group.
export default function AppLayout({ children }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </SessionProvider>
  );
}
