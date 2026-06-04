import type { Metadata } from 'next';
import { LandingPageContent } from '@/components/marketing/landing-page-content';

export const metadata: Metadata = {
  title: 'Voxori — Never Miss a Real Estate Lead Again',
  description:
    'AI inside sales agent for residential real estate. Answers every call, qualifies buyers, recommends MLS listings, and books showings 24/7.',
};

export default function LandingPage() {
  return <LandingPageContent />;
}
