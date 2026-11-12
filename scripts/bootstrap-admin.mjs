import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (email || password) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password || password.length < 16 || Buffer.byteLength(password) > 72) {
    throw new Error("Set a valid bootstrap email and a password of 16 characters to 72 bytes.");
  }

  let keys;
  try {
    keys = JSON.parse(process.env.ADMIN_TOTP_SECRETS || "{}");
  } catch {
    throw new Error("ADMIN_TOTP_SECRETS must be valid JSON.");
  }
  const key = keys?.[email];
  if (typeof key !== "string" || !/^[A-Z2-7]{32}$/.test(key)) {
    throw new Error("The bootstrap administrator needs a 32-character Base32 authenticator key.");
  }

  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: await bcrypt.hash(password, 12), role: "ADMIN", name: "Administrador" },
      select: { role: true },
    });
    if (admin.role !== "ADMIN") throw new Error("The bootstrap email belongs to a non-admin account.");
    console.log("Administrator provisioned.");
  } finally {
    await prisma.$disconnect();
  }
}
