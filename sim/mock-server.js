const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

console.log('🚀 Raksh Mock WebSocket Server running on ws://localhost:8080');

wss.on('connection', function connection(ws) {
  console.log('✅ Client connected');

  ws.on('message', function message(data) {
    try {
      const payload = JSON.parse(data);
      console.log('--- Incoming Vitals ---');
      console.log(`Patient: ${payload.patient_id}`);
      console.log(`Time: ${new Date(payload.timestamp * 1000).toLocaleTimeString()}`);
      console.table(payload.vitals);
      console.log('-----------------------\n');
    } catch (e) {
      console.log('Received raw message:', data.toString());
    }
  });

  ws.on('close', () => console.log('❌ Client disconnected'));
});
