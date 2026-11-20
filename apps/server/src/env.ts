// Imported right after dotenv in index.ts, before any module that reads env
// vars at import time, so startup fails with a clear message.
for (const name of ['DRIZZLE_DATABASE_URL', 'AUTH_SECRET']) {
  if (!process.env[name]) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}
