import { permanentRedirect, notFound } from 'next/navigation';
import { isValidPublicUsernameParam, publicProfilePath } from '@/lib/profile-url';
import { localizedPath } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; username: string }> };

/**
 * Legacy public freelancer URLs (`/freelancers/{username}`) redirect to the
 * canonical permalink (`/u/{username}`).
 */
export default async function LegacyFreelancerProfileRedirect({ params }: Props) {
  const { username, locale } = await params;
  const path = publicProfilePath(username);
  if (!path || !isValidPublicUsernameParam(username)) {
    notFound();
  }
  permanentRedirect(localizedPath(locale, path));
}
