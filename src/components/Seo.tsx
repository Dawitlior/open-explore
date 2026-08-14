import { Helmet } from "react-helmet-async";

/**
 * The one canonical public host. Everything else that serves this build
 * (Lovable preview, *.lovableproject.com, localhost) is a mirror and must be
 * kept out of the index.
 */
export const PRIMARY_HOST = "orcainvestment.co.il";
export const PRIMARY_ORIGIN = `https://${PRIMARY_HOST}`;

/** Kept for callers that still import SITE_URL. */
export const SITE_URL = PRIMARY_ORIGIN;

/**
 * The origin the page is actually being served from. Canonical and og:url are
 * self-referencing, so a page served from orcainvestment.co.il declares that
 * domain and a page served from the preview declares the preview — no
 * hardcoded cross-domain canonical can ever be emitted again.
 */
export function resolveOrigin(): string {
  if (typeof window === "undefined") return PRIMARY_ORIGIN;
  return window.location.origin;
}

export function isPrimaryHost(): boolean {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname.toLowerCase();
  return h === PRIMARY_HOST || h === `www.${PRIMARY_HOST}`;
}

/** Strip query strings and normalise trailing slashes away (root stays "/"). */
export function normalizePath(path: string): string {
  let p = (path || "/").split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

type SeoProps = {
  /** Full <title> for the route. */
  title: string;
  /** Unique meta description for the route. */
  description: string;
  /** Route path, e.g. "/auth". Used for canonical + og:url self-reference. */
  path: string;
  /** Private/authenticated surface — never indexable. */
  noindex?: boolean;
};

/**
 * Per-route head tags. Canonical and og:url always self-reference the route on
 * the serving origin. Any host that is not the primary domain is emitted as
 * noindex,nofollow so mirrors cannot compete with the real site.
 */
export default function Seo({ title, description, path, noindex = false }: SeoProps) {
  const origin = resolveOrigin();
  const url = `${origin}${normalizePath(path)}`;
  const blockIndex = noindex || !isPrimaryHost();
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {blockIndex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:locale" content="he_IL" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
