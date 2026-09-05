import type { NotificationLocale } from '../../notifications/notification-i18n.js';

const BRAND_AR = 'ليبي فريلانس';
const BRAND_EN = 'Libya Freelance';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildNotificationEmail(options: {
  locale: NotificationLocale;
  title: string;
  message: string;
  actionUrl: string;
  preferencesUrl: string;
  ctaLabel?: string;
}): { subject: string; text: string; html: string } {
  const isAr = options.locale !== 'en';
  const brand = isAr ? BRAND_AR : BRAND_EN;
  const brandSub = isAr ? BRAND_EN : BRAND_AR;
  const cta =
    options.ctaLabel ??
    (isAr ? 'عرض التفاصيل' : 'View details');
  const prefsLabel = isAr
    ? 'إدارة تفضيلات الإشعارات'
    : 'Manage notification preferences';
  const support = isAr
    ? 'هل تحتاج مساعدة؟ تواصل مع الدعم عبر البريد.'
    : 'Need help? Contact support by email.';
  const dir = isAr ? 'rtl' : 'ltr';
  const align = isAr ? 'right' : 'left';
  const safeUrl = escapeHtml(options.actionUrl);
  const safePrefs = escapeHtml(options.preferencesUrl);

  const subject = `${options.title} | ${brand}`;
  const text = [
    `${BRAND_AR} · ${BRAND_EN}`,
    '',
    options.title,
    '',
    options.message,
    '',
    `${cta}: ${options.actionUrl}`,
    '',
    `${prefsLabel}: ${options.preferencesUrl}`,
    '',
    support,
    '',
    `— ${brand}`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3ecdc;font-family:Tahoma,Arial,sans-serif;color:#15203c;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3ecdc;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffaf0;border:1px solid #e6dcc8;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;text-align:${align};">
              <div style="font-size:20px;font-weight:700;color:#15203c;">${escapeHtml(brand)}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">${escapeHtml(brandSub)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;text-align:${align};direction:${dir};">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;color:#15203c;">${escapeHtml(options.title)}</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(options.message)}</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${safeUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">${escapeHtml(cta)}</a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(support)}</p>
              <p style="margin:0;font-size:12px;line-height:1.6;">
                <a href="${safePrefs}" style="color:#ea580c;">${escapeHtml(prefsLabel)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #e6dcc8;text-align:center;font-size:11px;color:#9ca3af;">
              © ${new Date().getFullYear()} ${escapeHtml(BRAND_AR)} / ${escapeHtml(BRAND_EN)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
