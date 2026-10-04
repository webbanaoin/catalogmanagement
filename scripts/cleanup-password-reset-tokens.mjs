import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const USED_TOKEN_RETENTION_DAYS = 7;

async function main() {
  const now = new Date();
  const usedBefore = new Date(
    now.getTime() - USED_TOKEN_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );

  const result = await prisma.passwordResetToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        {
          usedAt: { not: null, lt: usedBefore },
        },
      ],
    },
  });

  process.stdout.write(
    `Deleted ${result.count} expired or old used password-reset token(s).\n`,
  );
}

main()
  .catch((error) => {
    console.error("Password-reset token cleanup failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
