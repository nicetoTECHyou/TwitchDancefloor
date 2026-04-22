// Wrapper that starts the standalone server
const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, '..', '..', 'standalone', 'server.js');
const child = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
});

child.on('exit', (code) => {
  console.log('Server exited with code:', code);
  process.exit(code);
});

process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
