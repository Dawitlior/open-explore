import { Helmet } from "react-helmet-async";

export const SITE_URL = "https://snuggle-build-play.lovable.app";

type SeoProps = {
  /** Full <title> for the route. */
  title: string;
  /** Unique meta description for the route. */
  description: string;
  /** Route path, e.g. "/auth". Used for canonical + og:url self-reference. */
  path: string;
};

/**
 * Per-route head tags. Canonical and og:url always self-reference the route so
 * crawlers never attribute this page's metadata to the homepage.
 */
export default function Seo({ title, description, path }: SeoProps) {
  const url = `${SITE_URL}${path === "/" ? "/" : path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
