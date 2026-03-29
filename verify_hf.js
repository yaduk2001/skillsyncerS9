const { generateViaPython } = require('./backend/utils/hf_python');

async function test() {
    try {
        console.log('Testing generateViaPython with missing script...');
        await generateViaPython({ title: 'Test', skills: [] });
        console.error('❌ Should have failed but succeeded');
    } catch (err) {
        if (err.message === 'hf_generate.py script not found') {
            console.log('✅ Correctly failed with expected error:', err.message);
        } else {
            console.error('❌ Failed with unexpected error:', err.message);
        }
    }
}

test();
