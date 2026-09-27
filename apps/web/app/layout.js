// Wraps every page. The title shows in the browser tab.
export const metadata = { title: "Dhaka Tesla Pool" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
