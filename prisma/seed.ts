import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.election.findFirst({
    where: { title: "Team Captain (demo)" },
  });
  if (existing) {
    console.log("Demo election already exists, skipping seed.");
    return;
  }

  await prisma.election.create({
    data: {
      title: "Team Captain (demo)",
      description: "Sample election created by the seed script.",
      publicSlug: "demo-team-captain",
      createdByEmail: "seed@local",
      status: "OPEN",
      openedAt: new Date(),
      candidates: {
        create: [
          { name: "Alex", sortOrder: 0 },
          { name: "Sam", sortOrder: 1 },
          { name: "Jordan", sortOrder: 2 },
        ],
      },
    },
  });

  console.log("Seeded demo election at /vote/demo-team-captain");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
