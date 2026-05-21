const run = async () => {
  try {
    const res = await fetch("https://raw.githubusercontent.com/okx/okx-api-v5-markdown/master/en/trade.md");
    let text = await res.text();
    let lines = text.split('\n');
    let found = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("orders-algo-pending") || lines[i].includes("Get uncompleted algo orders")) {
            found = i;
            break;
        }
    }
    if (found !== -1) {
        console.log("Found at", found);
        console.log(lines.slice(found, found + 50).join('\n'));
    } else {
        console.log("Not found");
    }
  } catch(e){ console.error(e) }
};
run();
