import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAIP National Dashboard",
  description:
    "Real, already-generated national-scale data from NAIP Weeks 1-4 -- hazard detection, water stress, crop intelligence, locust risk, exposure-risk fusion, and the insurance trigger-contract engine.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-app text-main">
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
