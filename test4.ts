import { getLeaderboard } from './leaderboardParser.ts';

async function run() {
  const rs = await getLeaderboard();
  console.log('Rows:', rs.length);
}
run();
