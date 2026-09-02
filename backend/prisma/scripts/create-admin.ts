import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const BCRYPT_ROUNDS = 12;

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const value = args[i + 1];
      if (value && !value.startsWith('--')) {
        result[key] = value;
        i += 1;
      }
    }
  }

  return result;
}

async function promptMissing(
  values: Record<string, string>,
  rl: readline.Interface,
) {
  const fields = ['email', 'password', 'firstName', 'lastName'] as const;

  for (const field of fields) {
    if (!values[field]) {
      const label =
        field === 'password'
          ? 'Password (min 8 chars)'
          : field === 'email'
            ? 'Email'
            : field === 'firstName'
              ? 'First name'
              : 'Last name';
      values[field] = await rl.question(`${label}: `);
    }
  }

  return values;
}

async function main() {
  const prisma = new PrismaClient();
  const rl = readline.createInterface({ input, output });

  try {
    const args = await promptMissing(parseArgs(), rl);
    const email = args.email?.toLowerCase().trim();
    const password = args.password ?? '';
    const firstName = args.firstName?.trim();
    const lastName = args.lastName?.trim();

    if (!email || !firstName || !lastName || password.length < 8) {
      throw new Error('Email, first/last name, and password (8+ chars) are required');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error(`User already exists for ${email}`);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const username = `admin-${Date.now().toString(36)}`;

    const role =
      args.super === 'true' || args.role === 'SUPER_ADMIN'
        ? Role.SUPER_ADMIN
        : Role.ADMIN;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        profile: {
          create: {
            firstName,
            lastName,
            username,
          },
        },
      },
      include: { profile: true },
    });

    console.log(role === Role.SUPER_ADMIN ? 'SUPER_ADMIN created successfully' : 'Admin user created successfully');
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Username: ${user.profile?.username}`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
