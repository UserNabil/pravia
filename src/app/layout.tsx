import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Pravia - La marketplace du materiel technologique",
    template: "%s | Pravia",
  },
  description:
    "Smartphones, ordinateurs, audio, gaming et composants. Achetez du materiel technologique neuf ou reconditionne, avec garantie et livraison offerte des 150 EUR.",
  keywords: ["marketplace", "high-tech", "smartphone", "ordinateur", "gaming", "reconditionne"],
  authors: [{ name: "Pravia" }],
  openGraph: {
    title: "Pravia - La marketplace du materiel technologique",
    description: "Le meilleur du high-tech, neuf et reconditionne.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#111318" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
