# Phase 3 — Authentication

## Purpose

Add Supabase Auth: registration, login, logout, password reset, and a protected dashboard.

There is no organisation UI in this phase.

## Pages

| Path | Access |
| --- | --- |
| `/login` | Public |
| `/register` | Public |
| `/forgot-password` | Public |
| `/update-password` | Signed-in (recovery or existing session) |
| `/dashboard` | Signed-in only |
| `/auth/callback` | Auth email link handler |

Unauthenticated requests to `/dashboard` redirect to `/login?next=…` so the user returns to that page after sign-in. A platform admin who logs in with no return URL goes to `/admin`.

## How it works

- `@supabase/ssr` stores the session in cookies.
- `middleware.ts` refreshes the session and protects `/dashboard`.
- Server actions in `lib/auth/actions.ts` handle register, login, logout, password reset, and signed-in profile updates (name, email, phone, password).
- Access checks use `getUser()`, not client-trusted session state.

Passwords must be at least 8 characters. Registration and the dashboard profile collect a phone number.

## Environment variables

Required on Vercel (and in `.env.local` for local work):

| Variable | Preview / `develop` | Production / `main` |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Development project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Development publishable (anon) key | Production publishable (anon) key |

Do not add the service-role key to Vercel or the frontend.

After adding variables, redeploy the Preview so the build picks them up.

## Supabase Auth settings

In the **development** Supabase project:

1. Authentication → Providers → Email: enabled.
2. Authentication → URL configuration:
   - Site URL: the `develop` Vercel Preview URL
   - Redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://fisheries-quota-exchange-git-develop-click-studio1.vercel.app/auth/callback`
     - `https://*-click-studio1.vercel.app/auth/callback`
     - `https://fisheries-quota-exchange.vercel.app/auth/callback`
3. For easier development testing you may disable **Confirm email**. If it stays enabled, registration asks the user to confirm by email before they can log in.

Repeat URL configuration on the **production** project before merging to `main`, using the production site URL.

## Not in this phase

- Organisation create/join screens
- Linking `organisation_users` to Auth users
- Quota, listings, auctions, payments

## Acceptance criteria

- User can register
- User can log in
- User can log out
- Signed-out users cannot open `/dashboard`
- Password reset email flow works
- `develop` Vercel Preview build succeeds
- Production is unchanged until `develop` is merged to `main`

## Troubleshooting

**Supabase public environment variables are not set**  
Add the two `NEXT_PUBLIC_` values to the Vercel Preview environment, then redeploy.

**Email link returns to login with an error**  
Add the callback URL to Supabase redirect URLs. Preview URLs change; a `https://*-click-studio1.vercel.app/auth/callback` wildcard covers them.

**Register succeeds but login fails**  
Confirm email is probably enabled. Open the confirmation email, or disable confirmation on the development project.
