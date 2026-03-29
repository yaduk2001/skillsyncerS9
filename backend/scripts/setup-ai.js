const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const aiDir = path.join(__dirname, '..', 'ai_service');
const isWin = os.platform() === 'win32';

// Use python3 on linux/mac, python on windows
const pyCommand = isWin ? 'python' : 'python3';

const venvCmd = `${pyCommand} -m venv venv`;
const pipCmd = isWin ? 'venv\\Scripts\\pip install -r requirements.txt' : 'venv/bin/pip install -r requirements.txt';
const spacyCmd = isWin ? 'venv\\Scripts\\python -m spacy download en_core_web_sm' : 'venv/bin/python -m spacy download en_core_web_sm';

console.log('\n=======================================');
console.log(' Setting up Python AI Service...');
console.log('=======================================\n');

try {
  console.log('1/3: Creating Python Virtual Environment...');
  execSync(venvCmd, { cwd: aiDir, stdio: 'inherit' });

  console.log('\n2/3: Installing Python Dependencies...');
  execSync(pipCmd, { cwd: aiDir, stdio: 'inherit' });

  console.log('\n3/3: Downloading NLP Model (spaCy)...');
  execSync(spacyCmd, { cwd: aiDir, stdio: 'inherit' });

  console.log('\n✅ Python AI Service setup complete!\n');
} catch (error) {
  console.error('\n❌ Failed to setup Python environment:', error.message);
  console.log('\nPlease ensure Python is installed and added to your PATH.');
  process.exit(1);
}
