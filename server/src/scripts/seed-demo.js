const { seedForEmail } = require('../demo/seed');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

async function main() {
  const email = getArg('--email');
  if (!email) {
    console.error('Usage: node src/scripts/seed-demo.js --email you@example.com');
    process.exit(1);
  }

  const result = await seedForEmail(email);
  console.log('✅ Seeded demo data:', result);
}

main().catch((err) => {
  console.error('❌ Failed to seed demo data:', err);
  process.exit(1);
});
