import { MarketingPage } from '@/components/marketing/marketing-page';
import { PLATFORM_NAME_AR } from '@/lib/branding';

export default function ContactPage() {
  return (
    <MarketingPage title="اتصل بنا" subtitle={`فريق ${PLATFORM_NAME_AR}`}>
      <p>للاستفسارات والدعم والشراكات:</p>
      <ul className="list-none space-y-2">
        <li>
          <strong>البريد:</strong> support@libyifreelance.ly
        </li>
        <li>
          <strong>السوق:</strong> ليبيا 🇱🇾
        </li>
        <li>
          <strong>العملة:</strong> الدينار الليبي (د.ل)
        </li>
      </ul>
      <p className="text-sm">سيتم تفعيل نموذج التواصل المباشر قريباً.</p>
    </MarketingPage>
  );
}
