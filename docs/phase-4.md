# Phase 4 — Organisations

## Purpose

A signed-in user’s account includes their business details. They can view the account on the dashboard, manage people and roles, and cannot create extra organisations.

There is no quota, marketplace, or listing functionality in this phase.

## Pages

| Path | Access |
| --- | --- |
| `/register` | Creates the Auth user and their business account |
| `/dashboard` | Overview |
| `/dashboard/profile` | Profile details (person, password, business) |
| `/dashboard/members` | Account members |
| `/organisations/new` | Redirects to the dashboard |
| `/organisations/[id]` | Redirects to `/dashboard?account=[id]` |

Signed-out users are redirected to `/login`.

Registration collects the user’s name plus legal name, trading name, and ABN. That creates the organisation and makes the user `OWNER`. A user may own only one account. They can still be added to someone else’s account.

## Roles

| Action | OWNER | ADMIN | MEMBER |
| --- | --- | --- | --- |
| View account and people | Yes | Yes | Yes |
| Edit business details | Yes | Yes | No |
| Add `ADMIN` or `MEMBER` | Yes | Yes | No |
| Add `OWNER` | Yes | No | No |
| Change a member's role | Yes | No | No |
| Remove a `MEMBER` | Yes | Yes | No |
| Remove an `OWNER` or `ADMIN` | Yes | No | No |
| Leave the account | Yes, unless last owner | Yes | Yes |

The last owner cannot be removed. Membership is keyed by email and matches the signed-in Auth user. Each member has a `full_name`. The fill-name trigger is `security definer` (`20260817350000_organisation_users_fill_name_definer.sql`) so it can read Auth names when a member is added.

`prevent_last_owner_removal` only blocks deleting or demoting the last owner. Admins and members can be removed. Fixed in `supabase/migrations/20260817110000_fix_member_delete_trigger.sql`.

Changing email on the profile updates Auth. After the new email is confirmed (if confirmation is on), a database trigger updates `organisation_users.email` so membership still matches.

Migration: `supabase/migrations/20260817100000_sync_membership_email.sql`

## Database

Migration: `supabase/migrations/20260816180000_organisation_rls.sql`

Later: `supabase/migrations/20260817090000_one_owned_account.sql` — `create_organisation` refuses a second owned account.

- `create_organisation(...)` creates the organisation and the owner row in one transaction
- RLS policies restrict select/update/insert/delete
- Helper `user_organisation_role(org_id)` is used by policies so they do not recurse
- Emails are stored lowercase

Do not create organisations in the Supabase dashboard as the normal process.

## Not in this phase

- Invitation emails (added later; see Phase 8 `sendEmail`)
- Quota, listings, auctions, payments
- Linking membership to `auth.users.id` (email remains the key)

## Acceptance criteria

- Registering creates a business account and the user is `OWNER`
- Dashboard shows account details without a separate organisation page
- The user cannot create another organisation
- A `MEMBER` cannot edit the profile or add people
- Push to `develop` applies the migration to development Supabase
- Vercel Preview build succeeds

## Troubleshooting

**Create account fails with permission denied**  
Confirm the organisation migrations applied on the **development** project. Check Actions → Apply development migrations.

**Added person cannot see the account**  
They must register/log in with the **same email**. Emails are compared in lowercase.
