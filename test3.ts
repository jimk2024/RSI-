import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { getLeaderboard } = require('./leaderboardParser.cjs');

async function run() {
  const rs = await getLeaderboard();
  console.log('Rows:', rs.length);
}
run();
