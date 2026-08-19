import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    template: "%s | Ticketing Platform",
    default: "Login | Ticketing Platform",
  },
  description: "Admin panel for the Ticket Booking Platform",
  icons: {
    icon: "/Assets/favicon.svg",
    shortcut: "/Assets/favicon.svg",
    apple: "/Assets/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/Assets/favicon.svg" />
      </head>
      <body style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
        <QueryProvider>
          <ToastProvider>{children}</ToastProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

