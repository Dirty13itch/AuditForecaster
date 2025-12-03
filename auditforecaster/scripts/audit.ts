import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const COLORS = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function log(message: string, color: string = COLORS.reset) {
    console.log(`${color}${message}${COLORS.reset}`);
}

function checkTodos() {
    log('\n🔍 Checking for Technical Debt (TODOs)...', COLORS.yellow);
    try {
        const output = execSync('grep -r "TODO" src || true').toString();
        const lines = output.split('\n').filter(Boolean);
        const count = lines.length;

        if (count > 10) {
            log(`⚠️  Found ${count} TODOs. Consider paying down technical debt.`, COLORS.yellow);
        } else {
            log(`✅  Technical debt is manageable (${count} TODOs).`, COLORS.green);
        }
    } catch (e) {
        log('⚠️  Could not run grep (Windows environment?)', COLORS.yellow);
    }
}

function checkSchemaIndexes() {
    log('\n🔍 Checking Database Schema Indexes...', COLORS.yellow);
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) {
        log('❌  schema.prisma not found!', COLORS.red);
        process.exit(1);
    }

    const content = fs.readFileSync(schemaPath, 'utf-8');
    const lines = content.split('\n');
    let missingIndexes = 0;

    // Very basic heuristic: Look for foreign keys (fields ending in Id) and check if they have an @@index or @unique
    // This is a simplified check for demonstration.

    // For now, let's just check if we have ANY indexes defined, as a proxy for "thought about performance"
    const indexCount = (content.match(/@@index/g) || []).length;

    if (indexCount < 5) {
        log(`⚠️  Only ${indexCount} indexes found. Review schema for performance gaps.`, COLORS.yellow);
    } else {
        log(`✅  Schema seems indexed (${indexCount} indexes found).`, COLORS.green);
    }
}

function checkEnvironment() {
    log('\n🔍 Checking Environment Configuration...', COLORS.yellow);
    const examplePath = path.join(process.cwd(), '.env.example');
    const envPath = path.join(process.cwd(), '.env');

    if (!fs.existsSync(examplePath)) {
        log('⚠️  .env.example is missing!', COLORS.yellow);
        return;
    }

    if (!fs.existsSync(envPath)) {
        log('❌  .env is missing!', COLORS.red);
        // Don't fail in CI, as secrets might be injected differently
        return;
    }

    const exampleKeys = fs.readFileSync(examplePath, 'utf-8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => l.split('=')[0].trim());

    const envKeys = fs.readFileSync(envPath, 'utf-8')
        .split('\n')
        .filter(l => l.includes('='))
        .map(l => l.split('=')[0].trim());

    const missing = exampleKeys.filter(k => !envKeys.includes(k));

    if (missing.length > 0) {
        log(`❌  Missing keys in .env: ${missing.join(', ')}`, COLORS.red);
        // process.exit(1); // Optional: Fail build
    } else {
        log('✅  Environment config matches example.', COLORS.green);
    }
}

function main() {
    log('🚀 Starting Architecture Audit...', COLORS.green);
    checkTodos();
    checkSchemaIndexes();
    checkEnvironment();
    log('\n✨ Audit Complete.', COLORS.green);
}

main();
