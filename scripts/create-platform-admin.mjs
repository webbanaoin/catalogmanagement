import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.ADMIN_NAME?.trim() || "Webbanao Admin";
const password = process.env.ADMIN_PASSWORD ?? "";

if (!email || !password) {
  console.error(
    "Set ADMIN_EMAIL and ADMIN_PASSWORD before running this command. ADMIN_NAME is optional.",
  );
  process.exitCode = 1;
} else if (password.length < 10 || password.length > 128) {
  console.error("ADMIN_PASSWORD must contain 10 to 128 characters.");
  process.exitCode = 1;
} else {
  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, platformRole: true },
    });

    if (existing) {
      console.error(
        "A user with this email already exists. Use npm run admin:grant -- <email> to grant that existing account admin access, or choose a dedicated admin email.",
      );
      process.exitCode = 1;
    } else {
      const passwordHash = await hash(password, 12);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          platformRole: "ADMIN",
          status: "ACTIVE",
        },
        select: {
          id: true,
          name: true,
          email: true,
          platformRole: true,
          status: true,
        },
      });

      console.log(`Created platform admin account for ${user.email}`);
    }
  } catch {
    console.error(
      "Unable to create platform admin. Confirm DATABASE_URL is correct and migrations are up to date.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
