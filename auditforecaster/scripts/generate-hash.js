const bcrypt = require('bcryptjs');

async function hash() {
    const hash = await bcrypt.hash('password123', 10);
    console.log(hash);
    console.log('Length:', hash.length);
}

hash();
