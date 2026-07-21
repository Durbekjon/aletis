/**
 * Grant (or revoke) platform-staff access on an existing user account so
 * they can use the internal admin panel. There is no self-serve staff
 * signup — the person must already have registered a normal account
 * through the app UI; this script only flips their platformRole.
 *
 * Usage:
 *   npx ts-node prisma/create-platform-admin.ts <email> <SUPERADMIN|STAFF|NONE>
 */
import { PrismaClient, PlatformRole } from '@prisma/client';

async function main() {
  const [email, roleArg] = process.argv.slice(2);
  if (!email || !roleArg) {
    console.error(
      'Usage: ts-node prisma/create-platform-admin.ts <email> <SUPERADMIN|STAFF|NONE>',
    );
    process.exit(1);
  }

  const role = roleArg.toUpperCase();
  if (!['SUPERADMIN', 'STAFF', 'NONE'].includes(role)) {
    console.error('Role must be one of: SUPERADMIN, STAFF, NONE');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(
      `No user found with email "${email}". They must register a normal account first.`,
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  const platformRole = role === 'NONE' ? null : (role as PlatformRole);
  await prisma.user.update({
    where: { id: user.id },
    data: { platformRole },
  });

  console.log(
    platformRole
      ? `✅ ${email} (user #${user.id}) is now platform role: ${platformRole}. They must log in again to get a token with this claim.`
      : `✅ ${email} (user #${user.id}) platform role cleared.`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
