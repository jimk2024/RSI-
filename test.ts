async function test() {
  try {
    const start = Date.now();
    const response = await fetch("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    console.log("Fetch MS:", Date.now() - start);
    
    const jsonStart = Date.now();
    const data = await response.json();
    console.log("Parse MS:", Date.now() - jsonStart);
    console.log("Total entries:", data.leaderboardRows?.length);
    
    const sliceStart = Date.now();
    const sliced = { leaderboardRows: data.leaderboardRows.slice(0, 500) };
    console.log("Sliced to 500");
  } catch(e) {
    console.error("Error:", e);
  }
}
test();
