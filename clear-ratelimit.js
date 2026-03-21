require('dotenv').config();
const Redis = require('ioredis');
const c = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function main() {
  const keys = await c.keys('ratelimit:*');
  console.log('Found rate limit keys:', keys);
  if (keys.length) {
    for (const k of keys) await c.del(k);
    console.log('All rate limit keys cleared!');
  } else {
    console.log('No rate limit keys found');
  }
  await c.quit();
}

main().catch(e => { console.error(e.message); c.quit(); });
