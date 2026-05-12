@AGENTS.md

# Engineering Standards — Next.js + Spring Boot Architecture

## 0. Mandatory src/ Folder Convention

**ALL application code MUST reside under `src/`.** No exceptions.

- Next.js config: `srcDir: true` (or rely on Next.js auto-detection).
- `app/`, `components/`, `lib/`, `store/`, `hooks/`, `types/` — all under `src/`.
- Root-level files only: config, `package.json`, `claude.md`, `.env`, Docker, etc.
- If Claude Code generates a file outside `src/`, reject it and redirect to `src/`.

## 1. Component Classification (Non-Negotiable)

Before writing any component, classify it. There is no third option.

| Type | Directive | File Location |
|------|-----------|---------------|
| **Server Component** | Default. No `"use client"`. Fetch data directly from Spring Boot via `src/lib/api/server-fetch.ts`. | `src/components/server/` or `src/app/**/` |
| **Client Component** | Only if it uses: `useState`, `useEffect`, `useReducer`, browser APIs, event handlers, RTK hooks, or third-party libs requiring DOM. Must have `"use client"` at the top. | `src/components/client/` |

**Rule**: If a component is 90% static and 10% interactive, extract the 10% into a `src/components/client/` island and keep the parent as a Server Component.

## 2. Folder Structure (Strict — All Under src/)

```
src/
├── app/                          # App Router — Server Components by default
│   ├── (route-groups)/           # Group routes without URL segments
│   ├── api/                      # Next.js API routes — MINIMAL USE
│   ├── layout.tsx                # Root layout: fonts, metadata, providers
│   ├── loading.tsx               # Global Suspense fallback
│   ├── error.tsx                 # Global error boundary
│   └── not-found.tsx
│
├── components/
│   ├── ui/                       # shadcn/ui primitives — DO NOT EDIT
│   ├── server/                   # SERVER COMPONENTS ONLY
│   │   ├── data-display/         # Tables, cards, lists (receive data via props)
│   │   ├── layout/               # Shells, navigation, breadcrumbs
│   │   └── content/              # Markdown, static renderers
│   └── client/                   # CLIENT COMPONENTS ONLY — must have "use client"
│       ├── forms/                # All forms: validation, submission, state
│       ├── interactive/          # Dialogs, toasts, toggles, filters
│       ├── charts/               # Any charting library
│       └── providers/            # Redux Provider, React Query Provider
│
├── lib/
│   ├── utils.ts                  # cn(), formatters, helpers
│   ├── api/
│   │   ├── server-fetch.ts       # Server-side fetch wrapper for Spring Boot
│   │   ├── spring-client.ts      # Base URL, headers, timeout config
│   │   └── cache-tags.ts         # next/revalidate tag constants
│   └── validations/              # Zod schemas — SHARED client/server
│
├── store/                        # Redux Toolkit — CLIENT ONLY
│   ├── store.ts
│   ├── slices/                   # Global UI state, auth state
│   └── api/                      # RTK Query endpoints for Spring Boot
│
├── hooks/                        # Custom hooks — CLIENT ONLY
├── types/                        # Shared TypeScript interfaces/DTOs
└── middleware.ts                 # Auth, route protection, redirects
```

**Prohibited paths**: `app/`, `components/`, `lib/`, `store/`, `hooks/`, `types/` at project root. All must be `src/app/`, `src/components/`, etc.

## 3. Data Fetching Rules

### Server Components (Preferred)
- Use `src/lib/api/server-fetch.ts` to call Spring Boot directly.
- No RTK Query in Server Components. Ever.
- Cache aggressively: `fetch(url, { next: { revalidate: 60 } })` or `unstable_cache`.
- Pass fetched data down as props to child Server Components.

### Client Components (Island Pattern Only)
- Use RTK Query hooks (`useGetXQuery`, `useCreateXMutation`) for:
  - Real-time or frequently changing data
  - Optimistic updates
  - User-initiated mutations (forms, buttons)
- Use `useEffect` + `fetch` only if RTK Query is overkill.

## 4. API Communication with Spring Boot

### Server-Side Fetch (`src/lib/api/server-fetch.ts`)
```typescript
// Handles auth headers from cookies, base URL, error normalization
// Returns typed data directly to Server Components
// No client JS shipped for this path
```

### Client-Side RTK Query (`src/store/api/springApi.ts`)
```typescript
// Base API slice for Spring Boot
// Inject endpoints per domain feature
// Handles caching, deduping, background refetching, optimistic updates
```

**Golden Rule**: If the data is needed for initial render, fetch it server-side. If it updates based on user interaction, use RTK Query client-side.

## 5. shadcn/ui Usage

- Install via CLI only: `npx shadcn add [component]`
- `src/components/ui/` is **generated code** — do not modify directly.
- Wrap/extend in `src/components/server/` or `src/components/client/` as needed.
- If a shadcn component needs interactivity (Dialog, Dropdown), create a wrapper in `src/components/client/interactive/`.

## 6. Form Handling

- All forms live in `src/components/client/forms/`.
- Use Zod schemas from `src/lib/validations/` for both client and server validation.
- Submit via RTK Query mutation or Server Action (if using Next.js Server Actions for proxy to Spring Boot).
- Show loading states, error messages, and success toasts.

## 7. State Management Boundaries

| State Type | Location | Tool |
|------------|----------|------|
| Server state (read) | Server Component | `fetch()` directly to Spring Boot |
| Server state (mutate) | Client Component | RTK Query mutation |
| Global UI state | `src/store/slices/uiSlice.ts` | Redux Toolkit |
| Auth state | `src/store/slices/authSlice.ts` | Redux Toolkit |
| Local form state | Inside form component | `useState` / React Hook Form |
| Ephemeral UI state | Inside interactive component | `useState` |

## 8. Performance Mandates

- **Server Components are the default**. Only opt into Client Components with explicit justification.
- Keep `"use client"` boundaries as small as possible — leaf nodes, not page roots.
- Use `loading.tsx` and `error.tsx` at every route segment for streaming.
- Use `React.Suspense` around Client Component islands in Server Components.
- Avoid prop drilling through Client Components — it forces unnecessary hydration.
- Images: use `next/image` with proper sizing.
- Fonts: use `next/font` for zero-layout-shift loading.

## 9. Type Safety

- All Spring Boot DTOs mirrored in `src/types/api.ts`.
- Zod schemas in `src/lib/validations/` derive TypeScript types via `z.infer<typeof schema>`.
- No `any` types. No `@ts-ignore` without code review comment.

## 10. Error Handling

- Server Components: throw errors to trigger nearest `error.tsx`.
- Client Components: RTK Query `onError` + toast notifications.
- API errors: normalize in `src/lib/api/server-fetch.ts` and `src/store/api/springApi.ts` to consistent shape `{ message: string, code: string, details?: unknown }`.

## 11. When to Break Rules

Never break rules 0, 1, 2, 3, or 8 without a written justification in a code comment and team approval.
