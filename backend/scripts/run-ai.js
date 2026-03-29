const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const isWin = os.platform() === 'win32';
const aiDir = path.join(__dirname, '..', 'ai_service');

// Automatically identify the correct Python virtual environment path based on OS (Windows vs Mac/Linux)
const uvicornPath = isWin
  ? path.join(aiDir, 'venv', 'Scripts', 'uvicorn')
  : path.join(aiDir, 'venv', 'bin', 'uvicorn');

const isDev = process.argv.includes('--dev');
const args = ['main:app', '--host', '0.0.0.0', '--port', '8000'];

if (isDev) {
  args.push('--reload');
}

console.log(`\n=======================================`);
console.log(` Starting AI Service ${isDev ? '(Dev/' : '('}Universal OS Mode)`);
console.log(` Target OS: ${isWin ? 'Windows (Scripts/)' : 'Unix (bin/)'}`);
console.log(`=======================================\n`);

const aiProcess = spawn(uvicornPath, args, {
  cwd: aiDir,
  stdio: 'inherit'
});

aiProcess.on('error', (err) => {
  console.error('\n❌ Failed to start the Python AI Service.');
  console.error(`Attempted path: ${uvicornPath}`);
  console.error('Error Details:', err.message);
  console.error('\n--> Solution: Did you run `npm install` inside the backend folder to set up the virtual environment first?\n');
});
