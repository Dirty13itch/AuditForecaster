export const mockSession = {
    user: {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'ADMIN',
        name: 'Test User'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}
