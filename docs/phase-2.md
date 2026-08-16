# Phase 2 — Application shell

## Purpose

Create the basic FQX UI: header, navigation, footer, responsive layout, and placeholder pages.

There is no marketplace, auction, or fishery functionality in this phase.

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Home |
| `/marketplace` | Placeholder for listings |
| `/fisheries` | Placeholder for fishery data |
| `/auctions` | Placeholder for auctions |
| `/about` | Product context |

## Layout

- Header: FQX identity and primary navigation
- Footer: Australia, development-site notice
- Shared intro layout in `components/page-intro.tsx`
- Colours and type tokens in `app/globals.css`

The header marks the current route. Navigation wraps on small screens.

## Not in this phase

- Authentication
- Organisation screens
- Live listings, bids, or fishery records
- New database tables

## Acceptance criteria

- All five pages load on the `develop` Vercel Preview
- Header and footer appear on every page
- Navigation reaches each page
- Layout is usable on a narrow screen
- Vercel Preview build succeeds
- Production is unchanged until `develop` is merged to `main`
