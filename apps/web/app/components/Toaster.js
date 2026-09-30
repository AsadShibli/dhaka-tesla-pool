"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "./Icons";

const ToastContext = createContext(() => {});
const MAX_VISIBLE = 4;

// Pop-ups that slide in from the right. Each one leaves when its countdown bar runs out,
// and the bar pauses while the pointer is over it (CSS), so a toast is never gone mid-read.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((list) => list.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    setTimeout(() => setToasts((list) => list.filter((toast) => toast.id !== id)), 260);
  }, []);

  const notify = useCallback((toast) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((list) => [...list, { tone: "blue", icon: "Bell", ...toast, id }].slice(-MAX_VISIBLE));
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map((toast) => {
          const Shape = Icon[toast.icon] ?? Icon.Bell;
          return (
            <div key={toast.id} className={`toast toast-${toast.tone} ${toast.leaving ? "leaving" : ""}`} role="status">
              <span className="toast-icon"><Shape /></span>
              <div className="toast-text">
                <strong>{toast.title}</strong>
                {toast.detail ? <span>{toast.detail}</span> : null}
              </div>
              <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}>
                <Icon.X />
              </button>
              <i className="toast-bar" onAnimationEnd={() => dismiss(toast.id)} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
