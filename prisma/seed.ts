import { PrismaClient, Role, ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@verasolis.studio" },
    update: { passwordHash, name: "Vera Solís", role: Role.ADMIN },
    create: {
      email: "admin@verasolis.studio",
      passwordHash,
      name: "Vera Solís",
      role: Role.ADMIN,
      locale: "es",
    },
  });

  const clientUser = await prisma.user.upsert({
    where: { email: "cliente@demo.com" },
    update: { passwordHash, name: "Laura Martín", role: Role.CLIENT },
    create: {
      email: "cliente@demo.com",
      passwordHash,
      name: "Laura Martín",
      role: Role.CLIENT,
      locale: "es",
    },
  });

  const profile = await prisma.clientProfile.upsert({
    where: { userId: clientUser.id },
    update: { phone: "+34 600 000 001", notes: "Cliente demo — boda Sitges" },
    create: {
      userId: clientUser.id,
      phone: "+34 600 000 001",
      notes: "Cliente demo — boda Sitges",
    },
  });

  const packA = await prisma.pack.upsert({
    where: { id: "seed-pack-20" },
    update: {},
    create: {
      id: "seed-pack-20",
      name: "Pack 20 ampliaciones",
      description: "20 ampliaciones 15×20 en papel fine art.",
      priceCents: 18000,
      currency: "EUR",
    },
  });

  const packB = await prisma.pack.upsert({
    where: { id: "seed-pack-album" },
    update: {},
    create: {
      id: "seed-pack-album",
      name: "Álbum premium 30x30",
      description: "Álbum artesanal 30×30 con 30 spreads.",
      priceCents: 45000,
      currency: "EUR",
    },
  });

  let project = await prisma.project.findFirst({
    where: { title: "Boda Laura & Martín — Sitges", clientId: profile.id },
  });

  if (!project) {
    project = await prisma.project.create({
      data: {
        title: "Boda Laura & Martín — Sitges",
        description: "Sesión entregada. Selecciona favoritas para el álbum.",
        sessionDate: new Date("2025-06-14"),
        status: ProjectStatus.DELIVERED,
        clientId: profile.id,
        packs: {
          create: [{ packId: packA.id }, { packId: packB.id }],
        },
      },
    });
  }

  console.log("Seed OK", {
    admin: admin.email,
    client: clientUser.email,
    project: project.title,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
