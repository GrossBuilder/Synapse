require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  await p['$connect']();
  console.log('DB Connected OK!');
  const count = await p.user.count();
  console.log('Users in DB:', count);
  await p['$disconnect']();
}

main().catch(e => { console.error('DB Error:', e.message); process.exit(1); });
