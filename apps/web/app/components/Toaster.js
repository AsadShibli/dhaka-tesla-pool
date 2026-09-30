"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

const ToastContext = createContext({ notify: () => {}, celebrate: () => {} });
const MAX_VISIBLE = 4;

// Pop-ups that slide in from the right. Each one leaves when its countdown bar runs out,
// and the bar pauses while the pointer is over it (CSS), so a toast is never gone mid-read.
// celebrate() opens one large centred card for a finished trip instead.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [celebration, setCelebration] = useState(null);
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

  const celebrate = useCallback((details) => setCelebration(details), []);
  const closeCelebration = useCallback(() => setCelebration(null), []);

  return (
    <ToastContext.Provider value={{ notify, celebrate }}>
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
      {celebration ? <Celebration {...celebration} onClose={closeCelebration} /> : null}
    </ToastContext.Provider>
  );
}

function Celebration({ title, subtitle, rows = [], action = "Done", onClose }) {
  const button = useRef(null);

  useEffect(() => {
    button.current?.focus();
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="celebrate-backdrop" onClick={onClose}>
      <div className="celebrate" role="dialog" aria-modal="true" aria-labelledby="celebrate-title" onClick={(event) => event.stopPropagation()}>
        <div className="celebrate-burst" aria-hidden="true">
          {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ "--i": index }} />)}
        </div>
        <div className="celebrate-mark"><Icon.Check /></div>
        <h2 id="celebrate-title">{title}</h2>
        {subtitle ? <p className="celebrate-sub">{subtitle}</p> : null}
        {rows.length ? (
          <dl className="celebrate-rows">
            {rows.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        ) : null}
        <button ref={button} type="button" className="btn btn-primary btn-block" onClick={onClose}>{action}</button>
      </div>
    </div>
  );
}

export function useToast() {
  return useContext(ToastContext).notify;
}

export function useCelebrate() {
  return useContext(ToastContext).celebrate;
}
