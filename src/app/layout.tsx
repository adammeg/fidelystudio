import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fidely — Studio",
  description: "Fidely growth layer for e-commerce merchants",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3d3029",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Static by design: isolates the public presentation from Turbopack's app CSS chunk. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/landing-v2.css" />
        {/* Static by design: stable authenticated UI styles in dev and production. */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/studio-v2.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
