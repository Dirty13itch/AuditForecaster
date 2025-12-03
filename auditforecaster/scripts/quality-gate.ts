import { execSync } from 'child_process'

const run = (command: string, name: string) => {
    console.log(`\nRunning ${name}...`)
    try {
        execSync(command, { stdio: 'inherit' })
        console.log(`✅ ${name} passed`)
    } catch (error) {
        console.error(`❌ ${name} failed`)
        process.exit(1)
    }
}

console.log('🚀 Starting Quality Gate...')

// 1. Type Check
run('npm run type-check', 'Type Check')

// 2. Lint
run('next lint', 'Lint')

// 3. Unit Tests
run('npm run test', 'Unit Tests')

// 4. E2E Smoke Test (Optional, can be slow)
// run('npx playwright test e2e/smoke.spec.ts', 'Smoke Tests')

console.log('\n🎉 Quality Gate Passed!')
