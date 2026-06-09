/**
 * /welcome route — thin shell. All landing markup lives under src/marketing/.
 * Previous single-file implementation (1046 lines) was replaced per the
 * approved "ORCA Landing v2" plan. Old version available in git history.
 */
import LandingPage from '@/marketing/LandingPage';

export default function Landing() {
  return <LandingPage />;
}
