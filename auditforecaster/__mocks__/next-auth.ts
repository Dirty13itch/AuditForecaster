import { vi } from 'vitest'
console.log('MANUAL MOCK LOADED')

const auth = vi.fn()
    ; (auth as any)._id = 'MANUAL_MOCK_AUTH'

const handlers = { GET: vi.fn(), POST: vi.fn() }
const signIn = vi.fn()
const signOut = vi.fn()

const NextAuth = vi.fn(() => ({
    auth,
    handlers,
    signIn,
    signOut,
}))

export default NextAuth
export { auth, handlers, signIn, signOut }
