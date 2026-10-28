import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { PRODUCT_NAME } from "@/lib/config";

// Accent display font (self-hosted by next/font): Fraunces, a soft variable
// serif whose medium italic matches the density of Neue Haas Display.
// latin-ext covers Latvian ā ē ģ ī ķ ļ ņ š ū ž.
const accentFont = Fraunces({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-accent",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} · Tavs nākamais solis, tavā tempā`,
  description:
    "Pārrunā savus jautājumus par skrīningu un atrodi laiku, kas der tev. Demo prototips ar paraugdatiem.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F9FD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="lv" className={accentFont.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
