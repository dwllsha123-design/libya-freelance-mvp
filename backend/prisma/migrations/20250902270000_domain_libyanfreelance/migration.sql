-- Align default platform URLs/emails with production domain libyanfreelance.ly

UPDATE "PlatformSetting"
SET "valueJson" = '"support@libyanfreelance.ly"'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'supportEmail';

UPDATE "PlatformSetting"
SET "valueJson" = '"https://libyanfreelance.ly/privacy"'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'privacyPolicyUrl';

UPDATE "PlatformSetting"
SET "valueJson" = '"https://libyanfreelance.ly/terms"'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'termsUrl';

UPDATE "PlatformSetting"
SET "valueJson" = '"https://libyanfreelance.ly/help"'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'supportUrl';

UPDATE "CmsContent"
SET "contentJson" = jsonb_set(
  COALESCE("contentJson", '{}'::jsonb),
  '{email}',
  '"support@libyanfreelance.ly"'::jsonb,
  true
),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'CONTACT'
  AND ("contentJson" ->> 'email') = 'support@libyafreelance.ly';
