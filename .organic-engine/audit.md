# Audit — 2026-11-02 (first run); 2026-11-03 note: site: spot check returned no indexed pages — owner to verify Search Console + submit sitemap

Source: repo source review (site is server-rendered Next.js).

## Found
- No sitemap.xml; robots.txt (static) had no Sitemap line. → FIXED: app/sitemap.ts + app/robots.ts (Disallow /api/, Sitemap line).
- AI crawlers: not blocked (robots allows all). Kept open.
- No llms.txt. → FIXED: /llms.txt route listing key pages + articles.
- No canonical tags, no Open Graph/Twitter metadata, no metadataBase. → FIXED in root layout; per-page canonicals on blog.
- No structured data. → FIXED: Organization + SoftwareApplication (site-wide); BlogPosting + FAQPage on posts.
- Title/description were generic. → Rewritten (title ≤60 chars intent: "Invoice in pounds, get paid in bitcoin").
- No blog. → ADDED /blog, /blog/[slug], /blog/rss.xml; Blog linked from landing nav and every footer.
- Home page is a client component but SSR-renders the landing; one H1. OK.
- FAQ/About/Privacy/Terms present (added earlier today). OK.

## Owner decisions pending
- None structural.

## Not yet checked (needs live access)
- Live render / Core Web Vitals / mobile — this workspace cannot fetch vercel.app or the custom domain; owner to spot-check.
- Search Console: not connected. Recommend adding the domain property and submitting /sitemap.xml.
