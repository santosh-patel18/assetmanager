const { exec } = require('child_process');

const SUBDOMAIN = 'assetflow-erp';
const PORT = 3000;
const DURATION_MS = 60 * 60 * 1000; // 1 hour
const endTime = Date.now() + DURATION_MS;

function startTunnel() {
  if (Date.now() >= endTime) {
    console.log('\n⏰ 1 hour is up. Tunnel closed.');
    process.exit(0);
  }

  console.log(`\n🔄 Starting tunnel... (${Math.round((endTime - Date.now()) / 60000)} min remaining)`);
  
  const child = exec(`npx -y localtunnel --port ${PORT} --subdomain ${SUBDOMAIN}`, (err) => {
    if (err && Date.now() < endTime) {
      console.log('⚠️  Tunnel dropped. Restarting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    }
  });

  child.stdout.on('data', (data) => {
    const line = data.toString().trim();
    console.log(line);
    if (line.includes('your url is:')) {
      console.log('\n✅ SHARE THIS LINK: ' + line.split('your url is: ')[1]);
      console.log('   Valid for ~1 hour. Auto-restarts if disconnected.\n');
    }
  });

  child.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    if (msg) console.log('  ' + msg);
  });

  child.on('exit', () => {
    if (Date.now() < endTime) {
      console.log('⚠️  Tunnel exited. Restarting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    }
  });
}

console.log('🚀 AssetFlow Tunnel — will stay alive for 1 hour');
console.log('   Press Ctrl+C to stop early\n');
startTunnel();
