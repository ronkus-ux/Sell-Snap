import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { PrismaClient } from '@prisma/client';

loadEnv();

const FORCE = process.argv.includes('--force');

if (process.env.NODE_ENV === 'production' && !FORCE) {
  console.error(
    'Refusing to run: NODE_ENV=production. This script is for local/test databases only.'
  );
  console.error('If you are absolutely sure, re-run with --force.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(
    'DATABASE_URL not found. Run this from the sellsnap root and make sure .env.local exists.'
  );
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const [orderCount, paymentCount] = await Promise.all([
    prisma.order.count(),
    prisma.payment.count(),
  ]);

  if (orderCount === 0 && paymentCount === 0) {
    console.log('Nothing to clear \u2014 orders and payments are already empty.');
    return;
  }

  console.log(`Found ${orderCount} order(s) and ${paymentCount} payment(s).`);

  const confirmed = FORCE || (await confirm());
  if (!confirmed) {
    console.log('Aborted \u2014 nothing was deleted.');
    return;
  }

  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.order.deleteMany(),
  ]);

  console.log(
    `Cleared ${orderCount} order(s) and ${paymentCount} payment(s). Products, users, and their links are untouched.`
  );
}

async function confirm() {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question('Type "yes" to delete ALL orders and payments: ');
  rl.close();
  return answer.trim().toLowerCase() === 'yes';
}

main().catch((err) => {
  prisma.$disconnect();
  console.error('Failed:', err.message);
  process.exit(1);
});

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('export ')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      if (!(key in process.env)) process.env[key] = value;
    }
  }
}