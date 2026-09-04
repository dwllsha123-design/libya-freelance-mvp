export type TransactionalEmailKind = 'password_reset' | 'email_verification';

export type TransactionalEmailContent = {
  subject: string;
  text: string;
  html: string;
  actionUrl: string;
};

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

function buildShell(options: {
  title: string;
  intro: string;
  buttonLabel: string;
  actionUrl: string;
  expiryNotice: string;
  securityNotice: string;
}): { text: string; html: string } {
  const safeUrl = escapeHtml(options.actionUrl);
  const text = [
    `${BRAND_AR} · ${BRAND_EN}`,
    '',
    options.title,
    '',
    options.intro,
    '',
    options.buttonLabel + ':',
    options.actionUrl,
    '',
    options.expiryNotice,
    '',
    options.securityNotice,
    '',
    `— ${BRAND_AR}`,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
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
            <td style="padding:24px 28px 8px;text-align:right;">
              <div style="font-size:20px;font-weight:700;color:#15203c;">${BRAND_AR}</div>
              <div style="font-size:12px;color:#6b7280;margin-top:4px;">${BRAND_EN}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;text-align:right;direction:rtl;">
              <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;color:#15203c;">${escapeHtml(options.title)}</h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#374151;">${escapeHtml(options.intro)}</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${safeUrl}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px;">${escapeHtml(options.buttonLabel)}</a>
              </p>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#6b7280;">إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:</p>
              <p style="margin:0 0 20px;font-size:12px;line-height:1.6;word-break:break-all;">
                <a href="${safeUrl}" style="color:#ea580c;">${safeUrl}</a>
              </p>
              <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(options.expiryNotice)}</p>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(options.securityNotice)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { text, html };
}

export function buildPasswordResetEmail(
  frontendUrl: string,
  token: string,
  expiresInLabel = 'ساعة',
): TransactionalEmailContent {
  const base = frontendUrl.replace(/\/$/, '');
  const actionUrl = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `إعادة تعيين كلمة المرور | ${BRAND_AR}`;
  const title = 'إعادة تعيين كلمة المرور';
  const intro =
    'تلقّينا طلباً لإعادة تعيين كلمة المرور لحسابك على ليبي فريلانس. اضغط الزر أدناه للمتابعة.';
  const { text, html } = buildShell({
    title,
    intro,
    buttonLabel: 'إعادة تعيين كلمة المرور',
    actionUrl,
    expiryNotice: `ينتهي صلاحية هذا الرابط خلال ${expiresInLabel}.`,
    securityNotice:
      'إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان. لن يتم تغيير كلمة مرورك.',
  });
  return { subject, text, html, actionUrl };
}

export function buildEmailVerificationEmail(
  frontendUrl: string,
  token: string,
  expiresInLabel = '24 ساعة',
): TransactionalEmailContent {
  const base = frontendUrl.replace(/\/$/, '');
  const actionUrl = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = `تأكيد بريدك الإلكتروني | ${BRAND_AR}`;
  const title = 'تأكيد بريدك الإلكتروني';
  const intro =
    'مرحباً بك في ليبي فريلانس. أكّد بريدك الإلكتروني بالضغط على الزر أدناه لتفعيل حسابك.';
  const { text, html } = buildShell({
    title,
    intro,
    buttonLabel: 'تأكيد البريد الإلكتروني',
    actionUrl,
    expiryNotice: `ينتهي صلاحية هذا الرابط خلال ${expiresInLabel}.`,
    securityNotice:
      'إذا لم تنشئ حساباً على ليبي فريلانس، يمكنك تجاهل هذه الرسالة بأمان.',
  });
  return { subject, text, html, actionUrl };
}
