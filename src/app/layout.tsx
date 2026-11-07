import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GCE Quote Manager - Calculation Engine",
  description: "Glass & Aluminum Shutters Quote Manager and Calculation Engine",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased" style={{ colorScheme: "light" }}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans" style={{ backgroundColor: "#f8fafc", color: "#0f172a" }}>
        {children}
      </body>
    </html>
  );
}
