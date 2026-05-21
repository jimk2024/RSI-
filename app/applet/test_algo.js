const run = async () => {
  try {
    const res = await fetch("http://127.0.0.1:3000/api/okx/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        endpoint: "/api/v5/trade/orders-algo-pending?instType=SWAP&ordType=oco",
        method: "GET"
      })
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text);
  } catch(e){ console.error(e) }
};
run();
