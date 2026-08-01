import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("Admin#12345", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@laundryos.app" },
    update: {},
    create: {
      email: "admin@laundryos.app",
      firstName: "System",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      passwordHash: adminPassword,
      emailVerified: new Date(),
    },
  });
  console.log("Admin created:", admin.email, "(password: Admin#12345 — change immediately)");

  const branch = await prisma.branch.upsert({
    where: { code: "CEB-01" },
    update: {},
    create: {
      name: "Cebu City Main Branch",
      code: "CEB-01",
      addressLine: "Fuente Osmeña, Cebu City",
      city: "Cebu City",
      latitude: 10.3157,
      longitude: 123.8854,
      deliveryRadiusKm: 12,
      businessHours: {
        mon: { open: "08:00", close: "20:00" },
        tue: { open: "08:00", close: "20:00" },
        wed: { open: "08:00", close: "20:00" },
        thu: { open: "08:00", close: "20:00" },
        fri: { open: "08:00", close: "20:00" },
        sat: { open: "08:00", close: "18:00" },
        sun: { open: "09:00", close: "16:00" },
      },
    },
  });

  const services = [
    { name: "Wash & Fold", slug: "wash-fold", pricingModel: "PER_KG", basePrice: 65, unit: "kg" },
    { name: "Wash & Dry", slug: "wash-dry", pricingModel: "PER_KG", basePrice: 55, unit: "kg" },
    { name: "Dry Cleaning", slug: "dry-cleaning", pricingModel: "PER_ITEM", basePrice: 180, unit: "item" },
    { name: "Ironing", slug: "ironing", pricingModel: "PER_ITEM", basePrice: 25, unit: "item" },
    { name: "Shoes Cleaning", slug: "shoes-cleaning", pricingModel: "PER_ITEM", basePrice: 150, unit: "item" },
    { name: "Blankets", slug: "blankets", pricingModel: "PER_ITEM", basePrice: 220, unit: "item" },
    { name: "Comforters", slug: "comforters", pricingModel: "PER_ITEM", basePrice: 280, unit: "item" },
    { name: "Curtains", slug: "curtains", pricingModel: "PER_KG", basePrice: 70, unit: "kg" },
  ] as const;

  for (const s of services) {
    await prisma.service.upsert({ where: { slug: s.slug }, update: {}, create: s as any });
  }

  const extras = [
    { name: "Express Service (6hr)", slug: "express", extraPrice: 100 },
    { name: "Same Day Delivery", slug: "same-day", extraPrice: 80 },
    { name: "Fragrance Boost", slug: "fragrance", extraPrice: 30 },
  ];
  for (const e of extras) {
    await prisma.extraOption.upsert({ where: { slug: e.slug }, update: {}, create: e });
  }

  await prisma.coupon.upsert({
    where: { code: "WELCOME50" },
    update: {},
    create: {
      code: "WELCOME50",
      type: "PERCENTAGE",
      value: 50,
      maxDiscount: 100,
      minOrderValue: 150,
      perUserLimit: 1,
      startsAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("Seed complete. Branch:", branch.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
