import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run admin:grant -- admin@example.com");
  process.exitCode = 1;
} else {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { platformRole: "ADMIN" },
      select: { id: true, email: true, platformRole: true },
    });
    console.log(`Granted platform admin role to ${user.email}`);
  } catch {
    console.error("Unable to grant platform admin role. Confirm the user exists and DATABASE_URL is correct.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
