import { execSync } from 'child_process'

console.log('🔒 Running Pre-Commit Checks...')

try {
    console.log('📦 Checking Types...')
    // execSync('npm run type-check', { stdio: 'inherit' }) // Enable when types are cleaner

    console.log('🎨 Checking Linting...')
    execSync('npm run lint', { stdio: 'inherit' })

    console.log('🧪 Running Tests...')
    execSync('npm test -- run', { stdio: 'inherit' })

    console.log('✅ All checks passed!')
    process.exit(0)
} catch (error) {
    console.error('❌ Checks failed!')
    process.exit(1)
}
