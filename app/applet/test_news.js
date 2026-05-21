import fetch from 'node-fetch';
async function test() {
  const res = await fetch("https://min-api.cryptocompare.com/data/v2/news/?lang=EN");
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2).slice(0, 500));
}
test();
