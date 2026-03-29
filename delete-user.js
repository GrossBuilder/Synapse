// Usage: node delete-user.js <email>
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: node delete-user.js <email>');
    process.exit(1);
  }
  const u = await p.user.findUnique({ where: { email } });
  if (!u) {
    console.log('User not found:', email);
    return;
  }
  await p.session.deleteMany({ where: { userId: u.id } });
  await p.account.deleteMany({ where: { userId: u.id } });
  await p.user.delete({ where: { id: u.id } });
  console.log('Deleted user:', u.email);
}

main().catch(console.error).finally(() => p.$disconnect());
