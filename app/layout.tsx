import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Text Display",
  description: "A focused, full-screen text display for WebMCP.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#050506" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
