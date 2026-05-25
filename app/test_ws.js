const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

ws.on('open', () => {
  ws.send(JSON.stringify({
    op: 'subscribe',
    args: [
      { channel: 'funding-rate', instId: 'BTC-USDT-SWAP' },
      { channel: 'liquidation-orders', instType: 'SWAP' },
      { channel: 'open-interest', instId: 'BTC-USDT-SWAP' },
      { channel: 'tickers', instId: 'BTC-USDT-SWAP' }
    ]
  }));
});

ws.on('message', (data) => {
  console.log(data.toString());
});

setTimeout(() => ws.close(), 5000);
