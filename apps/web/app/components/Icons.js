// Small line icons, drawn inline so the site needs no icon font.
function Svg({ children, ...props }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const Icon = {
  Gauge: (p) => <Svg {...p}><path d="M12 14l4-4" /><path d="M3.3 17a9 9 0 1 1 17.4 0" /><circle cx="12" cy="14" r="1" /></Svg>,
  Car: (p) => <Svg {...p}><path d="M5 17h14v-5l-2-5H7l-2 5v5z" /><path d="M5 12h14" /><circle cx="7.5" cy="17" r="1.5" /><circle cx="16.5" cy="17" r="1.5" /></Svg>,
  Plus: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></Svg>,
  Clock: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>,
  Tag: (p) => <Svg {...p}><path d="M20 12l-8 8-9-9V3h8z" /><circle cx="7.5" cy="7.5" r="1.2" /></Svg>,
  Bell: (p) => <Svg {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Svg>,
  User: (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>,
  Users: (p) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14a6.5 6.5 0 0 1 3.5 6" /></Svg>,
  Wallet: (p) => <Svg {...p}><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18" /><path d="M16 15h2" /><path d="M6 6l9-3 1 3" /></Svg>,
  Pin: (p) => <Svg {...p}><path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Svg>,
  Flag: (p) => <Svg {...p}><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></Svg>,
  Check: (p) => <Svg {...p}><path d="M5 12l5 5 9-10" /></Svg>,
  CheckCircle: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Svg>,
  X: (p) => <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>,
  Alert: (p) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></Svg>,
  Logout: (p) => <Svg {...p}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 17l-5-5 5-5" /><path d="M5 12h11" /></Svg>,
  Menu: (p) => <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>,
  Bolt: (p) => <Svg {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></Svg>,
  Power: (p) => <Svg {...p}><path d="M12 3v9" /><path d="M6.3 7a8 8 0 1 0 11.4 0" /></Svg>,
  Arrow: (p) => <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>,
  Seat: (p) => <Svg {...p}><path d="M7 4h6a2 2 0 0 1 2 2v7H7z" /><path d="M5 13h14v3H5z" /><path d="M7 16v4M17 16v4" /></Svg>,
  Cash: (p) => <Svg {...p}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 10v4M18 10v4" /></Svg>,
  Route: (p) => <Svg {...p}><circle cx="6" cy="19" r="2" /><circle cx="18" cy="5" r="2" /><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7" /></Svg>,
  Inbox: (p) => <Svg {...p}><path d="M3 13l3-8h12l3 8v6H3z" /><path d="M3 13h5l1 3h6l1-3h5" /></Svg>,
  Refresh: (p) => <Svg {...p}><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></Svg>,
  Shield: (p) => <Svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M9 12l2 2 4-4" /></Svg>,
};
