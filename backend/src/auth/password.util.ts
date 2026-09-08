import * as bcrypt from 'bcrypt';

/** Keep in sync with prisma/scripts/bootstrap-super-admin.mjs */
export const BCRYPT_ROUNDS = 12;

export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must contain at least one uppercase letter, one lowercase letter, and one number';

export function assertPasswordComplexity(password: string): void {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (!PASSWORD_COMPLEXITY_REGEX.test(password)) {
    throw new Error(PASSWORD_COMPLEXITY_MESSAGE);
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
