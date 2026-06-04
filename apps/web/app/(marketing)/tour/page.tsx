import { redirect } from 'next/navigation';

/** Alias route — canonical product tour lives at /how-it-works */
export default function TourPage() {
  redirect('/how-it-works');
}
