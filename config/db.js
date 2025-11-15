const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Ensure Prisma can connect before allowing operations.
 */
async function connectPrisma() {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to database');
  } catch (error) {
    console.error('❌ Failed to connect to the database:', error.message);
    process.exit(1);
  }
}

connectPrisma();

module.exports = prisma;
