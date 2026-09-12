import { permanentRedirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

type Props = { params: Promise<{ locale: string }> };

/** Permanent redirect: public /escrow → /pricing (marketplace pivot). */
export default async function EscrowRedirectPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  permanentRedirect(locale === 'en' ? '/en/pricing' : '/pricing');
}
