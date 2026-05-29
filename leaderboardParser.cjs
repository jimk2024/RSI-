const { parser } = require('stream-json');
const { pick } = require('stream-json/src/filters/pick.js');
const { streamArray } = require('stream-json/src/streamers/stream-array.js');
const { Readable } = require('stream');

async function getLeaderboard() {
  const response = await fetch("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!response.body) throw new Error("No body");

  let parsedCount = 0;
  const rows = [];
  const webStream = response.body;
  const nodeStream = Readable.fromWeb(webStream);

  return new Promise((resolve, reject) => {
    const pipeline = nodeStream
      .pipe(parser())
      .pipe(pick({ filter: 'leaderboardRows' }))
      .pipe(streamArray());

    pipeline.on('data', data => {
      rows.push(data.value);
      parsedCount++;
      if (parsedCount >= 500) {
        nodeStream.destroy();
      }
    });

    pipeline.on('end', () => resolve(rows));
    pipeline.on('close', () => resolve(rows));
    pipeline.on('error', err => reject(err));
  });
}

module.exports = { getLeaderboard };
