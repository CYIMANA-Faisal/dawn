export type User = {
  id: string
  email: string
  name: string
}

export type AuthResponse = {
  appAccessToken: string
  user: User
}
