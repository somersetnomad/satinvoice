import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { getBranding } from "@/lib/settings";
import { siteUrl } from "@/lib/blog";
import { getOperatorInfo } from "@/lib/operator";

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
  const title = `${brandName} — Invoice in pounds, get paid in bitcoin`;
  const description = `Bitcoin invoicing for freelancers: price in GBP, USD or EUR, get paid in sats over Lightning. Live BTC rate, Lightning QR, PDF invoices, VAT. First invoices free.`;
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { title, description, url: "/", siteName: brandName, type: "website", locale: "en_GB" },
    twitter: { card: "summary", title, description },
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
        <script
          type="application/ld+json"
          // Site-wide identity for search engines and AI assistants.
          dangerouslySetInnerHTML={{ __html: siteJsonLd() }}
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

function siteJsonLd(): string {
  const op = getOperatorInfo();
  const base = siteUrl();
  return JSON.stringify([
    { "@context": "https://schema.org", "@type": "Organization", name: op.name, url: base, email: op.contact },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "SatInvoice",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: base,
      offers: { "@type": "Offer", price: "0", priceCurrency: "GBP", description: "Free plan; one-time unlock paid in sats" },
      publisher: { "@type": "Organization", name: op.name },
    },
  ]).replace(/</g, "\\u003c");
}
