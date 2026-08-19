# Phase 4 — Organisations

## Purpose

A signed-in user’s account includes their business details. They can view the business on the dashboard, manage people and roles, and cannot create extra businesses.

There is no quota, marketplace, or listing functionality in this phase.

## Pages

| Path | Access |
| --- | --- |
| `/register` | Creates the Auth user (name, email, phone). Business details are added later on Business Settings |
| `/select-account` | After login, choose which business to use when the person belongs to more than one |
| `/invitations/[token]` | Signed-in invitee accepts or declines. Login is required; an active organisation cookie is not. |
| `/dashboard` | Overview. Pending invitations to this person are listed here. |
| `/dashboard/profile` | Account Settings: Profile, Password and Security, Notifications, and Alerts |
| `/dashboard/account` | Business Settings: Details, Members, Payments, and Notifications (role routing and business message list) |
| `/dashboard/members` | Redirects to `/dashboard/account?tab=members` |
| `/dashboard/payments` | Redirects to `/dashboard/account?tab=payments` |
| `/dashboard/alerts` | Redirects to `/dashboard/profile?tab=alerts` |
| `/dashboard/notifications` | Inbox for this person |
| `/organisations/new` | Redirects to the dashboard |
| `/organisations/[id]` | If that organisation is already active, redirects to Overview. Otherwise offers Switch business |

Registration collects the user’s name, email, phone, and password. After email confirm they add legal name, trading name, and ABN on `/dashboard/account`. That creates the organisation and makes the user `OWNER`. They must complete those business details, and agree to the terms, before they can buy or list. A user may own only one business. They can still be invited to someone else’s business.

Login is personal (email and password). If the person belongs to two or more businesses, they choose which business to use on `/select-account` after login. That choice is stored in an httpOnly session cookie and is the source of truth for holdings, listings, orders, members, payments, buying, and bidding. There is no Buy as / Bid as picker. The dashboard chrome shows **Operating as** the active business, with **Switch business** under that name when they have more than one membership. The sidebar is two sections: **You** (Account Settings, Inbox) and **This business** (Overview, Business Settings, Quota Holdings, Listings, Orders). Account Settings and Inbox stay personal. Business Settings and the rest follow the active business. Deep links that belong to another membership prompt a switch; they do not change business silently.

Signed-out users are redirected to `/login`.

## Roles

| Action | OWNER | ADMIN | MEMBER |
| --- | --- | --- | --- |
| View business and people | Yes | Yes | Yes |
| Edit business details | Yes | Yes | No |
| Change who receives business email | Yes | Yes | No |
| Invite `ADMIN` or `MEMBER` | Yes | Yes | No |
| Invite `OWNER` | Yes | No | No |
| Cancel a pending invitation | Yes | Yes, except Owner invites | No |
| Change a member's role | Yes | No | No |
| Remove a `MEMBER` | Yes | Yes | No |
| Remove an `OWNER` or `ADMIN` | Yes | No | No |
| Leave the business | Yes, unless last owner | Yes | Yes |

The last owner cannot be removed. Membership is keyed by email and matches the signed-in Auth user. Each member has a `full_name`. The fill-name trigger is `security definer` (`20260817350000_organisation_users_fill_name_definer.sql`) so it can read Auth names when a member is added.

Owners and admins invite people. That creates a pending `organisation_invitations` row and emails `member_added` with an accept link. The person is not inserted into `organisation_users` until they accept while signed in as that email. Re-inviting the same pending email rotates the token. Migration: `supabase/migrations/20260819110000_organisation_invitations.sql`.

`prevent_last_owner_removal` only blocks deleting or demoting the last owner. Admins and members can be removed. Fixed in `supabase/migrations/20260817110000_fix_member_delete_trigger.sql`.

Changing email on the profile updates Auth. After the new email is confirmed (if confirmation is on), a database trigger updates `organisation_users.email` so membership still matches.

Migration: `supabase/migrations/20260817100000_sync_membership_email.sql`

## Database

Migration: `supabase/migrations/20260816180000_organisation_rls.sql`

Later: `supabase/migrations/20260817090000_one_owned_account.sql` — `create_organisation` refuses a second owned business.

- `create_organisation(...)` creates the organisation and the owner row in one transaction
- Other members join through `accept_organisation_invitation` after an invite. Managers cannot insert `organisation_users` rows directly
- RLS policies restrict select/update/delete
- Helper `user_organisation_role(org_id)` is used by policies so they do not recurse
- Emails are stored lowercase

Do not create organisations in the Supabase dashboard as the normal process.

## Not in this phase

- Quota, listings, auctions, payments
- Linking membership to `auth.users.id` (email remains the key)

## Acceptance criteria

- Registering creates a user account. Adding business details creates the business and the user is `OWNER`
- Dashboard shows business details without a separate organisation page
- The user cannot create another business
- A `MEMBER` cannot edit business details or invite people
- Push to `develop` applies the migration to development Supabase
- Vercel Preview build succeeds

## Troubleshooting

**Create account fails with permission denied**  
Confirm the organisation migrations applied on the **development** project. Check Actions → Apply development migrations.

**Added person cannot see the business**  
They must register/log in with the **same email**. Emails are compared in lowercase.
