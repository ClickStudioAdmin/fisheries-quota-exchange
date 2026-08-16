# Phase 4 — Organisations

## Purpose

Let a signed-in user create an organisation, view its profile, manage membership, and enforce roles.

There is no quota, marketplace, or listing functionality in this phase.

## Pages

| Path | Access |
| --- | --- |
| `/dashboard` | Lists organisations the user belongs to |
| `/organisations/new` | Create organisation (creator becomes `OWNER`) |
| `/organisations/[id]` | Profile and members. Hidden if the user is not a member |

Signed-out users are redirected to `/login`.

## Roles

| Action | OWNER | ADMIN | MEMBER |
| --- | --- | --- | --- |
| View organisation and members | Yes | Yes | Yes |
| Edit profile | Yes | Yes | No |
| Add `ADMIN` or `MEMBER` | Yes | Yes | No |
| Add `OWNER` | Yes | No | No |
| Change a member's role | Yes | No | No |
| Remove a `MEMBER` | Yes | Yes | No |
| Remove an `OWNER` or `ADMIN` | Yes | No | No |
| Leave the organisation | Yes, unless last owner | Yes | Yes |

The last owner cannot be removed. Membership is keyed by email and matches the signed-in Auth user.

## Database

Migration: `supabase/migrations/20260816180000_organisation_rls.sql`

- `create_organisation(...)` creates the organisation and the owner row in one transaction
- RLS policies restrict select/update/insert/delete
- Helper `user_organisation_role(org_id)` is used by policies so they do not recurse
- Emails are stored lowercase

Do not create organisations in the Supabase dashboard as the normal process.

## Not in this phase

- Invitation emails
- Quota, listings, auctions, payments
- Linking membership to `auth.users.id` (email remains the key)

## Acceptance criteria

- Signed-in user can create an organisation and become `OWNER`
- The user can open that organisation
- A `MEMBER` cannot edit the profile or add members
- A non-member cannot open `/organisations/[id]`
- Push to `develop` applies the migration to development Supabase
- Vercel Preview build succeeds

## Troubleshooting

**Create organisation fails with permission denied**  
Confirm the Phase 4 migration applied on the **development** project. Check Actions → Apply development migrations.

**Added member cannot see the organisation**  
They must register/log in with the **same email**. Emails are compared in lowercase.
