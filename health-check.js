// health-check.js
//
// Tiny HTTP server so an uptime monitor (UptimeRobot, Better Uptime, etc.)
// has something to ping — this is what keeps a Render Web Service instance
// from spinning down on the free tier.
//
// Usage: put this file in your project root, then add this single line
// near the top of index.js (right after `require('dotenv').config();`):
//
//     require('./health-check');
//
// No extra npm packages needed — this only uses Node's built-in 'http' module.

const http = require('node:http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/' ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            uptime_seconds: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        }));
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'not found' }));
});

server.listen(PORT, () => {
    console.log(`Health check server listening on port ${PORT}`);
});

module.exports = server;