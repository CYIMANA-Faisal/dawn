import type { Configuration } from '@azure/msal-browser'

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MSAL_CLIENT_ID!,
    authority: process.env.NEXT_PUBLIC_MSAL_AUTHORITY!,
    redirectUri: process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI!,
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI!,
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const loginRequest = {
  scopes: ['openid', 'profile', 'email'],
}
