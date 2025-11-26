export const mockSession = {
    user: {
        name: 'Test User',
        email: 'test@example.com',
        image: null,
        role: 'ADMIN',
        id: 'user-1'
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
}
