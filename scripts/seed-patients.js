/*
  One-off seeder to insert 10 sample patients for testing.
  Safe to re-run: uses upsert on unique phone numbers.
*/
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function samplePatients() {
  const base = [
    { name: 'Nimal Perera', email: 'nimal.perera@example.com', address: 'Colombo 05' },
    { name: 'Sunethra Jayasuriya', email: 'sunethra.j@example.com', address: 'Kandy' },
    { name: 'Ruwan Fernando', email: 'ruwan.fernando@example.com', address: 'Negombo' },
    { name: 'Ishara Weerasinghe', email: 'ishara.w@example.com', address: 'Galle' },
    { name: 'Kasun Silva', email: 'kasun.silva@example.com', address: 'Maharagama' },
    { name: 'Tharaka Dissanayake', email: 'tharaka.d@example.com', address: 'Kurunegala' },
    { name: 'Dilani Abeywickrama', email: 'dilani.a@example.com', address: 'Matara' },
    { name: 'Chathura Bandara', email: 'chathura.b@example.com', address: 'Anuradhapura' },
    { name: 'Harini Amarasinghe', email: 'harini.a@example.com', address: 'Gampaha' },
    { name: 'Ravindu Jayawardena', email: 'ravindu.j@example.com', address: 'Colombo 03' },
  ];

  // Generate unique Sri Lankan mobile-like numbers with +94 prefix
  return base.map((p, idx) => {
    const num = 770000000 + (Math.floor(Math.random() * 90000) + idx); // ensure uniqueness within this run
    return {
      name: p.name,
      phone: `+94${String(num).slice(-9)}`,
      email: p.email,
      address: p.address,
    };
  });
}

async function main() {
  const patients = samplePatients();
  for (const patient of patients) {
    await prisma.patient.upsert({
      where: { phone: patient.phone },
      update: {},
      create: patient,
    });
  }
  console.log(`Inserted or ensured ${patients.length} patients.`);
}

main()
  .catch((e) => {
    console.error('Seeding patients failed', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

