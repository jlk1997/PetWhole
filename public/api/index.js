// API module index
export default {
  user: {
    login: () => Promise.resolve({ data: { token: 'test-token', user: { username: 'test-user' } } }),
    getUserInfo: () => Promise.resolve({ data: { _id: '123', username: 'test-user', email: 'test@example.com' } })
  },
  pet: {
    getPets: () => Promise.resolve({ data: [] })
  },
  post: {},
  walk: {},
  location: {},
  auth: {}
} 