# 🚀 Next.js + Microsoft Authentication (MSAL) + RTK Query Plan

## 🎯 Goal

Implement authentication where:

- `/` → Login page
- `/dashboard` → Protected page
- Users sign in with Microsoft accounts
- Minimal scopes are used: `openid`, `profile`, `email`
- Microsoft token is ONLY used for identity
- Backend issues your own JWT
- RTK Query attaches your JWT to requests

---

# 🧱 1. Install Dependencies

```bash
pnpm add @azure/msal-browser@latest @azure/msal-react@latest
````

---

# ⚙️ 2. Environment Variables (Next.js)

Create:

```text
.env.local
```

```env
NEXT_PUBLIC_MSAL_CLIENT_ID=YOUR_CLIENT_ID
NEXT_PUBLIC_MSAL_AUTHORITY=https://login.microsoftonline.com/common
NEXT_PUBLIC_MSAL_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```
---

# 🔐 3. MSAL Configuration

```ts
// src/lib/msalConfig.ts
import type { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_MSAL_CLIENT_ID!,
    authority: process.env.NEXT_PUBLIC_MSAL_AUTHORITY!,
    redirectUri: process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI!,
    postLogoutRedirectUri: process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI!,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["openid", "profile", "email"],
};
```

---

# 🧠 4. MSAL Instance

```ts
// src/lib/msalInstance.ts
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./msalConfig";

export const msalInstance = new PublicClientApplication(msalConfig);
```

---

# 🌐 5. Wrap App with MSAL Provider

```tsx
// src/app/providers.tsx
"use client";

import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "@/auth/msalInstance";

export function Providers({ children }: { children: React.ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
```

```tsx
// src/app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

# 🗂️ 6. Redux Auth Slice

```ts
// src/store/authSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type AuthState = {
  appAccessToken: string | null;
  user: any | null;
};

const initialState: AuthState = {
  appAccessToken: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<AuthState>) => {
      state.appAccessToken = action.payload.appAccessToken;
      state.user = action.payload.user;
    },
    clearCredentials: (state) => {
      state.appAccessToken = null;
      state.user = null;
    },
  },
});

export const { setCredentials, clearCredentials } = authSlice.actions;
export default authSlice.reducer;
```

---

# 🔌 7. RTK Query Base API

```ts
// src/services/baseApi.ts
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.appAccessToken;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),
  endpoints: () => ({}),
});
```

---

# 🔐 8. Auth API (Exchange Token)

```ts
// src/services/authApi.ts
import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    loginWithMicrosoft: builder.mutation({
      query: (body: { token: string }) => ({
        url: "/auth/microsoft",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const { useLoginWithMicrosoftMutation } = authApi;
```

---

# 🔑 9. Login Page (`/`)

```tsx
// src/app/page.tsx
"use client";

import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { useRouter } from "next/navigation";
import { loginRequest } from "@/auth/msalConfig";
import { useLoginWithMicrosoftMutation } from "@/services/authApi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";

export default function Home() {
  const { instance, accounts } = useMsal();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.appAccessToken);

  const [loginWithMicrosoft] = useLoginWithMicrosoftMutation();

  useEffect(() => {
    if (token) {
      router.push("/dashboard");
    }
  }, [token]);

  useEffect(() => {
    const run = async () => {
      if (!accounts.length || token) return;

      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      const backend = await loginWithMicrosoft({
        token: response.idToken,
      }).unwrap();

      dispatch(setCredentials(backend));
      router.push("/dashboard");
    };

    run();
  }, [accounts]);

  return (
    <div>
      <h1>Welcome</h1>
      <button onClick={() => instance.loginRedirect(loginRequest)}>
        Sign in with Microsoft
      </button>
    </div>
  );
}
```

---

# 🔒 10. Protected Route Wrapper

```tsx
// src/components/Protected.tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";

export function Protected({ children }: { children: React.ReactNode }) {
  const token = useAppSelector((s) => s.auth.appAccessToken);
  const router = useRouter();

  useEffect(() => {
    if (!token) {
      router.push("/");
    }
  }, [token]);

  if (!token) return null;

  return <>{children}</>;
}
```

---

# 📊 11. Dashboard Page

```tsx
// src/app/dashboard/page.tsx
"use client";

import { Protected } from "@/components/Protected";
import { useAppSelector } from "@/store/hooks";

export default function Dashboard() {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <Protected>
      <h1>Dashboard</h1>
      <p>{user?.email}</p>
    </Protected>
  );
}
```

---

# 🚪 12. Logout

```tsx
// src/components/LogoutButton.tsx
"use client";

import { useMsal } from "@azure/msal-react";
import { useAppDispatch } from "@/store/hooks";
import { clearCredentials } from "@/store/authSlice";

export function LogoutButton() {
  const { instance } = useMsal();
  const dispatch = useAppDispatch();

  const logout = async () => {
    dispatch(clearCredentials());
    await instance.logoutRedirect();
  };

  return <button onClick={logout}>Logout</button>;
}
```

---

# 🔐 Security Strategy

### Microsoft Tokens

* Managed by MSAL
* Stored in sessionStorage
* NOT manually stored

### App JWT

* Stored in Redux memory
* Not persisted in localStorage
* Re-fetched using MSAL silently if needed

---

# 🔄 Final Flow

```
User visits /
→ clicks login
→ Microsoft login
→ redirect back to /
→ MSAL processes session
→ frontend gets Microsoft ID token
→ sends to backend
→ backend returns app JWT
→ Redux stores JWT
→ redirect to /dashboard
→ RTK Query uses JWT for API calls
```

---

# ✅ Entra ID Setup
Notes : already done this setup
```
Platform: SPA
Redirect URI: http://localhost:3000
Supported accounts: Any org + personal
```

---

# 🧪 Test Checklist

* Login works
* Redirect works
* Dashboard protected
* API calls include JWT
* Logout works

```

