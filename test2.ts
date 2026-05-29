import streamJson from 'stream-json';
const { parser } = streamJson;
import pickModule from 'stream-json/filters/Pick.js';
const { pick } = pickModule;
import streamArrayModule from 'stream-json/streamers/StreamArray.js';
const { streamArray } = streamArrayModule;

async function run() {
  const response = await fetch("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  if (!response.body) throw new Error("No body");

  let parsedCount = 0;
  const rows = [];

  // Need to adapt node-fetch/web stream to Node.js stream
  // Next.js/Node18 fetch uses Web Streams.
  const { Readable } = require('stream');
  const webStream = response.body;
  const nodeStream = Readable.fromWeb(webStream);

  const pipeline = nodeStream
    .pipe(parser())
    .pipe(pick({ filter: 'leaderboardRows' }))
    .pipe(streamArray());

  pipeline.on('data', data => {
    rows.push(data.value);
    parsedCount++;
    if (parsedCount >= 500) {
      console.log("Got 500 rows, destroying stream...");
      nodeStream.destroy();
      console.log("Stream destroyed.");
    }
  });

  pipeline.on('end', () => {
    console.log("Pipeline ended. Rows:", rows.length);
  });
  
  pipeline.on('error', err => {
    console.error("Pipeline error:", err.message);
  });
}
run();
