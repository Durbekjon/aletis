/**
 * Store an Instagram access token for an organization (encrypted), so the
 * retention engine can send Instagram DMs.
 *
 * Usage:
 *   npx ts-node prisma/set-instagram-account.ts <IG_USER_ID> <IG_ACCESS_TOKEN> [orgId] [username]
 *
 * Encryption matches EncryptionService (aes-256-gcm, "iv:encrypted:authTag" hex)
 * using ENCRYPTION_KEY from .env.
 */
import fs from 'fs';
import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

function readEnv(key: string): string | undefined {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && m[1] === key) return m[2].replace(/\s+(#|←).*$/, '').trim();
  }
  return undefined;
}

function encrypt(plaintext: string, keyHex: string): string {
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'hex');
  enc += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${enc}:${authTag.toString('hex')}`;
}

async function main() {
  const [igUserId, token, orgArg, username] = process.argv.slice(2);
  if (!igUserId || !token) {
    console.error(
      'Usage: ts-node prisma/set-instagram-account.ts <IG_USER_ID> <IG_ACCESS_TOKEN> [orgId] [username]',
    );
    process.exit(1);
  }
  const organizationId = orgArg ? Number(orgArg) : 1;
  const keyHex = readEnv('ENCRYPTION_KEY') || process.env.ENCRYPTION_KEY || '';
  const accessTokenEncrypted = encrypt(token, keyHex);

  const prisma = new PrismaClient();
  const account = await prisma.instagramAccount.upsert({
    where: { instagramUserId: igUserId },
    update: { accessTokenEncrypted, instagramUsername: username ?? undefined, organizationId },
    create: {
      organizationId,
      instagramUserId: igUserId,
      instagramUsername: username ?? null,
      accessTokenEncrypted,
    },
  });
  console.log(
    `✅ InstagramAccount #${account.id} saved for org ${organizationId} (IG user ${igUserId}). Token encrypted & stored.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
