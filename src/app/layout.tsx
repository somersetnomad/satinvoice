import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { getBranding } from "@/lib/settings";

// Self-hosted (npm `geist`) so builds never depend on reaching Google Fonts.
const geistSans = GeistSans;
const geistMono = GeistMono;

// The white-label title must follow the operator's *current* settings —
// never prerender the shell at build time.
export const dynamic = "force-dynamic";

// White-label title: the operator's brand name (Settings/env) replaces
// SatInvoice across browser tabs, bookmarks and link previews. Never throws —
// if the DB is unreachable the built-in defaults apply.
export async function generateMetadata(): Promise<Metadata> {
  const { brandName } = await getBranding();
  return {
    title: `${brandName} — Professional invoices, priced in bitcoin`,
    description: `Create professional invoices priced in satoshis with live BTC rates, Lightning Address payment QR codes, and PDF export. Built for freelancers on a bitcoin standard.`,
    keywords: ["bitcoin", "invoice", "lightning", "sats", "freelance", "LNURL"],
    // Favicon set lives in src/app/ (favicon.ico, icon.svg, icon.png, apple-icon.png)
    // and is picked up automatically by the Next.js file conventions.
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
