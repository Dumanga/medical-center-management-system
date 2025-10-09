/*
  One-off script to clear all billing sessions and their line items.
  Frontend will then show an empty sessions list. Patients, treatments,
  medicines, and other data remain intact.

  Usage: node scripts/clear-sessions.js
*/

const prisma = require('../src/lib/prisma').default || require('../src/lib/prisma');

async function main() {
  console.log('[clear-sessions] Starting…');
  try {
    // Delete children first (defensive), then sessions. Relations are set to CASCADE,
    // but explicit deletes ensure compatibility across environments.
    const deletedMedicineItems = await prisma.sessionMedicine.deleteMany({});
    console.log(`[clear-sessions] Deleted session medicine items: ${deletedMedicineItems.count}`);

    const deletedTreatmentItems = await prisma.sessionTreatment.deleteMany({});
    console.log(`[clear-sessions] Deleted session treatment items: ${deletedTreatmentItems.count}`);

    const deletedSessions = await prisma.session.deleteMany({});
    console.log(`[clear-sessions] Deleted sessions: ${deletedSessions.count}`);

    console.log('[clear-sessions] Done.');
  } catch (error) {
    console.error('[clear-sessions] Failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();

