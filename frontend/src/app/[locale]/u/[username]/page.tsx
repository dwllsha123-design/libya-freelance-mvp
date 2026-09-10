import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FreelancerPublicProfile } from '@/components/freelancers/freelancer-public-profile';
import { API_BASE_URL, CLIENT_REQUEST_HEADER, type PublicProfile } from '@/lib/api';
import { PLATFORM_NAME_EN } from '@/lib/branding';
import {
  isSafePublicImageUrl,
  isValidPublicUsernameParam,
  publicProfileAbsoluteUrl,
  publicProfilePath,
} from '@/lib/profile-url';
import { localizedPath } from '@/lib/seo';

type Props = { params: Promise<{ locale: string; username: string }> };

async function fetchPublicFreelancer(username: string): Promise<PublicProfile | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/freelancers/${encodeURIComponent(username)}`, {
      headers: { [CLIENT_REQUEST_HEADER]: 'libya-freelance' },
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as PublicProfile;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, locale } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://libyanfreelance.ly';

  if (!isValidPublicUsernameParam(username)) {
    return { title: `Profile | ${PLATFORM_NAME_EN}` };
  }

  const profile = await fetchPublicFreelancer(username);
  if (!profile) {
    return { title: `Profile | ${PLATFORM_NAME_EN}` };
  }

  const displayName = `${profile.firstName} ${profile.lastName}`.trim();
  const description = (
    profile.bio ||
    profile.freelancer?.professionalTitle ||
    `${displayName} on ${PLATFORM_NAME_EN}`
  ).slice(0, 160);

  const path = publicProfilePath(profile.username);
  if (!path) {
    return { title: `Profile | ${PLATFORM_NAME_EN}` };
  }
  const canonicalPath = localizedPath(locale, path);
  const arPath = localizedPath('ar', path);
  const enPath = localizedPath('en', path);
  const canonical = `${baseUrl}${canonicalPath}`;
  const absolute = publicProfileAbsoluteUrl(profile.username, baseUrl);
  // Prefer non-localized production permalink for OG when Arabic default
  const ogUrl = locale === 'en' ? canonical : absolute ?? canonical;

  const images = isSafePublicImageUrl(profile.profilePhoto)
    ? [{ url: profile.profilePhoto! }]
    : undefined;

  return {
    title: `${displayName} | ${PLATFORM_NAME_EN}`,
    description,
    alternates: {
      canonical,
      languages: {
        'ar-LY': `${baseUrl}${arPath}`,
        en: `${baseUrl}${enPath}`,
        'x-default': `${baseUrl}${arPath}`,
      },
    },
    openGraph: {
      title: `${displayName} | ${PLATFORM_NAME_EN}`,
      description,
      url: ogUrl,
      type: 'profile',
      locale: locale === 'en' ? 'en' : 'ar_LY',
      siteName: PLATFORM_NAME_EN,
      images,
    },
    twitter: {
      card: images ? 'summary_large_image' : 'summary',
      title: `${displayName} | ${PLATFORM_NAME_EN}`,
      description,
      images: images?.map((image) => image.url),
    },
  };
}

export default async function PublicProfilePermalinkPage({ params }: Props) {
  const { username } = await params;

  if (!isValidPublicUsernameParam(username)) {
    notFound();
  }

  const profile = await fetchPublicFreelancer(username);
  if (!profile) {
    notFound();
  }

  return <FreelancerPublicProfile username={profile.username} initialProfile={profile} />;
}
