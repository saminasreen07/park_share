import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ParkShare - P2P Parking Marketplace",
  description: "AI-Powered Peer-to-Peer Parking Space Marketplace connecting homeowners and drivers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <title>ParkShare - P2P Parking Marketplace</title>
        <meta name="description" content="AI-Powered Peer-to-Peer Parking Space Marketplace connecting homeowners and drivers." />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
export type { Metadata };
