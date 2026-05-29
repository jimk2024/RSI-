import parser from 'stream-json';
import pick from 'stream-json/filters/pick.js';
import streamArray from 'stream-json/streamers/stream-array.js';
import { Readable } from 'stream';

export async function getLeaderboard() {
  const response = await fetch("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!response.body) throw new Error("No body");

  let parsedCount = 0;
  const rows: any[] = [];
  const webStream = response.body as unknown as any;
  const nodeStream = Readable.fromWeb(webStream);

  return new Promise<any[]>((resolve, reject) => {
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
