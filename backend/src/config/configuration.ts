export default () => ({
  port: parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  email: {
    from: process.env.EMAIL_FROM ?? 'noreply@libyafreelance.ly',
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
  },
  tokens: {
    passwordResetExpiresIn: process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN ?? '1h',
    emailVerificationExpiresIn:
      process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN ?? '24h',
  },
  storage: {
    localDir: process.env.STORAGE_LOCAL_DIR,
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
  },
});
