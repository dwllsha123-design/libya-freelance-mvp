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
    from: process.env.EMAIL_FROM ?? 'noreply@libyanfreelance.ly',
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
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localDir: process.env.STORAGE_LOCAL_DIR,
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL,
    portfolioPublicBaseUrl: process.env.STORAGE_PORTFOLIO_PUBLIC_BASE_URL,
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? 'auto',
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
      publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE ?? 'false',
    },
  },
  payment: {
    driver: process.env.PAYMENT_DRIVER ?? 'simulated',
    currency: process.env.PAYMENT_CURRENCY ?? 'LYD',
    simulatedFailure: process.env.PAYMENT_SIMULATED_FAILURE ?? 'false',
  },
});
