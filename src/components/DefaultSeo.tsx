import { useLocation } from "react-router-dom";
import Seo, { normalizePath } from "./Seo";

const SITE_TITLE = "Orca — פלטפורמת המסחר לסוחרים מקצועיים";
const SITE_DESCRIPTION =
  "Orca — מערכת ניהול סיכונים, אנליטיקה התנהגותית ויומן מסחר חכם. נסה חינם 7 ימים.";

/**
 * The public (indexable) surface. Everything else is the authenticated app and
 * is emitted noindex,nofollow.
 */
const PUBLIC_PATHS = ["/welcome", "/auth", "/terms", "/privacy", "/accessibility"];

export function isPublicPath(pathname: string): boolean {
  const p = normalizePath(pathname);
  return PUBLIC_PATHS.includes(p);
}

/**
 * Sitewide head defaults. Rendered above the router outlet so every route has a
 * title, description and a self-referencing canonical; public pages override it
 * with their own <Seo /> (later Helmet wins).
 */
export default function DefaultSeo() {
  const { pathname } = useLocation();
  return (
    <Seo
      title={SITE_TITLE}
      description={SITE_DESCRIPTION}
      path={pathname}
      noindex={!isPublicPath(pathname)}
    />
  );
}
