/**
 * Next.js server startup hook.
 * Bootstrap is explicitly opt-in and restricted to the staging hostname.
 * No public HTTP endpoint is exposed for privileged account creation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.ADMIN_BOOTSTRAP_ENABLED !== "true") return;

  if (process.env.APP_URL !== "https://staging.webbanao.in") {
    console.error("[admin-bootstrap] Refused: this bootstrap is restricted to staging.webbanao.in");
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim() || "Webbanao Admin";
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!email || !email.includes('@') || !email.split('@')[1]?.includes('.') ||
      name.length > 120 || email.length > 191 ||
      password.length < 12 || password.length > 128) {
    console.error("[admin-bootstrap] Invalid configuration; set ADMIN_EMAIL, ADMIN_NAME and a 12-128 character ADMIN_PASSWORD");
    return;
  }

  // Do not run a privileged database write in Next.js's compilation phase.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const [{ PrismaClient }, { hash }] = await Promise.all([
    import("@prisma/client"),
    import("bcryptjs"),
  ]);
  const prisma = new PrismaClient();
  try {
    // Only an empty administrative installation is eligible. Never promote
    // existing users or reset an existing account's password.
    const [adminCount, existingUser] = await Promise.all([
      prisma.user.count({ where: { platformRole: "ADMIN" } }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (adminCount > 0 || existingUser) {
      console.info("[admin-bootstrap] Skipped: an administrator or specified user already exists");
      return;
    }
    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await hash(password, 12),
        platformRole: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.info("[admin-bootstrap] Initial staging administrator created. Remove ADMIN_BOOTSTRAP_ENABLED and ADMIN_PASSWORD from hosting environment now.");
  } catch (error) {
    // Never include connection strings or credentials in application logs.
    console.error("[admin-bootstrap] Unable to create administrator. Check staging DB connectivity and migrations.", error instanceof Error ? error.name : "UnknownError");
  } finally {
    await prisma.$disconnect();
  }
}
