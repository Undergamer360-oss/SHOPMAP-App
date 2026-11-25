# SHOPMAP demo walkthrough

## Quick start

1. Open the app in Expo Go (or the web build).
2. On **Welcome**, either choose **Get started** for the full setup or **Skip setup** to go straight to Home as a guest.
3. Setup can also be skipped on **Create your account** and **Where should we deliver?** with **Skip for now**.
4. Guest shoppers can add details later from **Profile → Add details**.

The theme is black/white (Uber-style): black on white in light mode, white on black in dark mode. Map shelves stay monochrome; a single blue accent marks active wayfinding only.

Home opens straight onto the **SHOPMAP DEMO** wordmark with a five-item thumbnail preview. Product thumbnails are bundled locally (47 small Twemoji PNGs, ~44 KB total), matched by exact demo name, then keyword, then department, then a cart fallback. That gives all ten demo items a curated image and 99.5% of the 2,929-product catalog a specific local image. There are no network calls and it works offline in Expo Go. Twemoji artwork is by Twitter and licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Live demo script

1. Go to **Home → Start a shopping list**.
2. Tap **Load 10 items**. Each tap builds a fresh zig-zag list; consecutive demos never reuse the same order.
3. Tap **Build route**. The route review shows the optimised distance and the saving over list order.
4. Tap **Start navigation**.
5. For each item card, point out:
   - the item name with **in aisle** and **located in** underneath,
   - the person-relative first turn (**Turn left from the shelf** or **Turn right from the shelf**, assuming the shopper is facing the shelf), then **Go straight — 8 m**, **Turn right — 4 m**, **Arrive at Produce**,
   - the highlighted leg on a map fitted to the current start and stop.
6. Press **Got it, next** ten times, then **Finish trip** for checkout: 11 advances total.
7. On a second run, press **Skip** once to show that it advances and records the skipped stop.

## Store model

- Store: **41.5 × 58 m** (83 × 116 map units at 0.5 m per unit).
- Shelves: **1 m** deep; walking aisles **1.5 m** wide; centre-to-centre aisle pitch **2.5 m**.
- Walking speed: 1.2 m/s, plus 20 s at each department stop.
- Routing grid blocks every shelf, so no leg crosses a gondola.

## Verification

Run the headless criteria check:

```bash
npx --yes tsx scripts/verify-success-criteria.ts
```

It checks:

- 17 pre-checked demo orders, each with 10 departments visited exactly once, at least 15% saving, and a route never longer than list order;
- all sample legs stay out of shelves;
- directions exist for every leg, their metre distances match the leg distance, the first turn after a pickup matches the shopper facing the shelf, and no direction uses compass headings;
- 11 navigation advances, Skip behaviour, and a changing instruction per step;
- all ten demo thumbnails and at least 95% catalog thumbnail coverage.

Also run before a demo:

```bash
npx tsc --noEmit
npx eslint .
```

## Novice-user test plan

Ask three first-time users to:

1. Open the app and skip setup.
2. Add any six items to the list.
3. Build the route and complete the first three navigation steps without help.

Record completion time and any confusion. Target: all three finish in under three minutes. The demo list has a **Load 10 items** shortcut, but this test should use manual adds so the search flow is covered.
