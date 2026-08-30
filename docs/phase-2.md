# Phase 2 — Application shell

## Purpose

Create the basic FQX UI: header, navigation, footer, responsive layout, and placeholder pages.

There is no marketplace, auction, or fishery functionality in this phase.

## Pages

| Path | Purpose |
| --- | --- |
| `/` | Public home: what FQX is, how trading works, current listings and fisheries |
| `/marketplace` | Placeholder for listings |
| `/fisheries` | Placeholder for fishery data |
| `/auctions` | Placeholder for auctions |
| `/about` | Product context |
| `/contact` | Contact us |

## Layout

- Header: FQX logo (links home), primary navigation, and member links
- Primary navigation: Fisheries, Marketplace, Auctions
- Footer: pinned to the bottom of the page, with About and Contact us
- Shared intro layout in `components/page-intro.tsx`
- Colours and type tokens in `app/globals.css`

The header marks the current route. Navigation wraps on small screens. Dashboard and Admin use a left-hand sub-navigation panel.

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
