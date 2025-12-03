import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const HARNESS_DIR = path.join(process.cwd(), '.agent', 'harness');
const FEATURES_FILE = path.join(HARNESS_DIR, 'features.json');
const PROGRESS_FILE = path.join(HARNESS_DIR, 'progress.md');

function printHeader(title: string) {
    console.log(`\n\x1b[1m\x1b[36m=== ${title} ===\x1b[0m`);
}

function runCommand(command: string) {
    try {
        return execSync(command, { encoding: 'utf8' }).trim();
    } catch (error) {
        return `Error executing command: ${command}`;
    }
}

function main() {
    console.log('\x1b[1m\x1b[32mAuditForecaster Agent Initialization\x1b[0m');

    // 1. Environment Context
    printHeader('Environment');
    console.log(`PWD: ${process.cwd()}`);
    console.log(`Node: ${process.version}`);
    console.log(`Date: ${new Date().toISOString()}`);

    // 2. Git History
    printHeader('Recent Git History');
    console.log(runCommand('git log --oneline -n 5'));

    // 3. Progress Log (Tail)
    printHeader('Recent Progress');
    if (fs.existsSync(PROGRESS_FILE)) {
        const progress = fs.readFileSync(PROGRESS_FILE, 'utf8');
        const lines = progress.split('\n');
        const tail = lines.slice(-15).join('\n');
        console.log(tail || '(Log is empty)');
    } else {
        console.log('(No progress log found)');
    }

    // 4. Active Features
    printHeader('Active Features');
    if (fs.existsSync(FEATURES_FILE)) {
        try {
            const features = JSON.parse(fs.readFileSync(FEATURES_FILE, 'utf8'));
            const active = features.features.filter((f: any) =>
                ['todo', 'in-progress', 'failed'].includes(f.status)
            );

            if (active.length === 0) {
                console.log('No active features found. Good job!');
            } else {
                active.forEach((f: any) => {
                    const color = f.status === 'failed' ? '\x1b[31m' : f.status === 'in-progress' ? '\x1b[33m' : '\x1b[37m';
                    console.log(`${color}[${f.status.toUpperCase()}] ${f.id}: ${f.description}\x1b[0m`);
                    if (f.verification_steps) {
                        console.log(`   Verification: ${f.verification_steps.join(', ')}`);
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing features.json');
        }
    } else {
        console.log('(No features file found)');
    }

    // 5. System Check
    printHeader('System Check');
    console.log('Running type check...');
    try {
        execSync('npm run type-check', { stdio: 'inherit' });
        console.log('\x1b[32mType check passed.\x1b[0m');
    } catch (e) {
        console.log('\x1b[31mType check failed. Fix errors before proceeding.\x1b[0m');
    }
}

main();
