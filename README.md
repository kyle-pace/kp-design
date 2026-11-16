# kp-design

The design system for Kyle Pace's websites: design tokens, self-hosted Atkinson Hyperlegible type, the display settings panel, and the shared header and footer. Used by [kylepace.net](https://kylepace.net), [kylepace.dev](https://kylepace.dev) and every experiment on kylepace.dev, so they look and work like one site.

It follows [kyle-pace/principles](https://github.com/kyle-pace/principles): accessibility first (WCAG 2.2 AA in light and dark mode), Atkinson Hyperlegible everywhere, and motion only when a person's device allows it.

## Install

Installed from GitHub, pinned to a commit (or a release tag, once one exists):

```sh
npm install github:kyle-pace/kp-design#<commit-sha>
```

No build step. Astro compiles the components inside the site that uses them.

## Use

On kylepace.dev and its experiments, use the ready-made layout:

```astro
---
import DevLayout from 'kp-design/layouts/DevLayout.astro';
---

<DevLayout title="Transit" accent="sky" image="/transit/share.png" imageAlt="...">
  ...
</DevLayout>
```

Other sites (kylepace.net) build their own layout from the parts:

```astro
---
import 'kp-design/global.css';
import { Header, Footer, DisplaySettings, DisplaySettingsInit } from 'kp-design';
---

<html lang="en">
  <head>
    <!-- ... -->
    <DisplaySettingsInit />
  </head>
  <body>
    <a class="skip-link" href="#main">Skip to content</a>
    <Header
      name="kylepace"
      suffix=".dev"
      mono
      href="https://kylepace.dev/"
      links={[
        { href: 'https://kylepace.dev/', label: 'Experiments' },
        { href: 'https://kylepace.net/', label: 'kylepace.net', emphasis: true },
      ]}
    />
    <main id="main"><slot /></main>
    <Footer
      links={[
        { href: 'https://kylepace.net/', label: 'kylepace.net' },
        { href: 'mailto:mail@kylepace.net', label: 'Email' },
        { href: 'https://kylepace.dev/privacy/', label: 'Privacy' },
      ]}
    />
    <DisplaySettings accessibilityHref="https://kylepace.dev/accessibility/" />
  </body>
</html>
```

Use absolute URLs in the header and footer when the page might run on a different Worker than the hub (every experiment on kylepace.dev does).

## What's in it

| What | Where | Notes |
| --- | --- | --- |
| Design tokens | `styles/tokens.css` (`kp-design/tokens.css`) | Colors in light and dark, accents with AA-safe text shades, type scale, space, radius, motion |
| Base styles | `styles/global.css` (`kp-design/global.css`) | Imports the tokens and the Atkinson fonts; resets, prose, skip link, and the rules each display setting turns on |
| `Header` | `components/Header.astro` | Wordmark plus nav. Props: `name`, `suffix`, `mono`, `href`, `links` |
| `Footer` | `components/Footer.astro` | Link row, Pride dots, profile badges. Props: `links`, `openDoorHref`. A `mailto:` link copies the address |
| `DisplaySettings` | `components/DisplaySettings.astro` | The floating panel: theme, text size, contrast, font, spacing, motion, links. Prop: `accessibilityHref` |
| `DisplaySettingsInit` | `components/DisplaySettingsInit.astro` | Goes in `<head>`; applies saved settings before paint |
| `StatusBadge` | `components/StatusBadge.astro` | "Draft" or "In progress" pill. Prop: `status` |
| `SocialBadges` | `components/SocialBadges.astro` | LinkedIn, GitHub and Mastodon, with each brand's official logo from `assets/brands/` |
| `DevLayout` | `layouts/DevLayout.astro` (`kp-design/layouts/DevLayout.astro`) | The whole page shell for kylepace.dev and its experiments: head and share-card tags, header, footer, display settings and analytics. Props: `title`, `description`, `accent`, `image`, `imageAlt`, `imageWidth`, `imageHeight`, `noindex`; a `head` slot for extra tags |
| Analytics | `lib/analytics.ts` (`kp-design/analytics`) | `startAnalytics({ apiKey, liveHosts })`, `isOptedOut`, `setOptOut`, `track`, `isAutomated`, `isInternalBrowser`. The private Amplitude setup from the principles, skipping bots and tagging Kyle's browsers (`?internal=on`) |
| kylepace.dev settings | `lib/kylepace-dev.ts` (`kp-design/kylepace-dev`) | The hub's nav and footer links and its Amplitude project, used by `DevLayout` |

Per-page accents: set `data-accent="sky"` (or tangerine, pink, violet, lime, sunshine, sage, evening, coral, mint) on any element.

Display settings are saved per domain, so a choice made on kylepace.net doesn't carry over to kylepace.dev.

## Releasing a change

1. Change it here, and try it in a real site first (`npm i ../kp-design` in a local clone), including its build and an axe check in light and dark mode.
2. Bump `version` in `package.json` and commit. Optionally make a release for it on GitHub (Releases, Draft a new release, tag `vX.Y.Z`).
3. Update each site's dependency to the new commit or tag.

## Changelog

- **0.7.2**: The floating display settings button tucks away while the page scrolls down and comes back on scrolling up, near the top, at the bottom, on keyboard focus or with its panel open, so it never sits on content.
- **0.7.1**: On phones (below 36rem) "More labs by Kyle" shortens to "More labs", so it and "About this project" fit on one line on an iPhone.
- **0.9.3**: The site switch's tooltip stays out of the layout until shown (it widened 320px pages by 28px).
- **0.9.2**: The kylepace.dev header says "Resume (PDF)" out loud and on screen (was "(PDF)" for screen readers only).
- **0.9.1**: `MoreLabs` takes `--more-labs-inset` (default the gutter) for labs whose `<main>` is already inset.
- **0.9.0**: Navigation fixes from a usability study (November 15, 2026).
  - LabLayout: "Back to <lab>" now shows on every page of a lab except its main one (About, technical pages, directories), and goes back in history when the lab was the page before, so a search or map view comes back. Subpage titles name their lab ("Transit agencies · World transit · kylepace.dev"). About pages end with a "More labs" list (`MoreLabs`, data in `lib/labs.ts`; add each new lab there). The bar is a `<header>`, its nav is named "Lab", the footer links are a nav named "Elsewhere", and "What this connects to" is "Connections", as on the hub. `<main>` takes focus from the skip link (tabindex -1), here and in DevLayout.
  - BarButton: the main buttons shorten below 36rem (was 24rem), so "Back to World transit" plus "More labs" fit one row on a 390px phone; the quiet "More labs by Kyle" keeps its credit down to 22.5rem unless the bar has three buttons (`shortOnPhones`).
  - LabWelcome: the About link says "About this project", like the bar. Closing it puts focus on the page's `main h1` (or `[data-welcome-focus]`), not nowhere.
  - Header: each site in the switch has a short `about` ("Labs and apps I build"), shown as a tooltip on hover or keyboard focus and read by screen readers.
  - Footer: "Say hi" is a full 44px tap target.
  - DisplaySettings: on phones the round button is 44px and tighter in the corner, so it covers less of the page.
- **0.8.2**: On a lab's About page, "Back to <lab>" moves to the far left of the bar, with "More labs by Kyle" beside it (still shortened to "Back" and "More labs" on phones).
- **0.8.1**: `welcome` also takes `{ name, text }`, for labs whose `lab.name` is worded for "Back to …" ("the search").
- **0.8.0**: A first-visit welcome for labs. `LabLayout` takes a `welcome` prop (one to three sentences); a first-time visitor sees them in a dialog with the lab's name, a line about Kyle, "Start exploring" and a link to the About page. Shown once per lab per browser, never to bots, never on the About page. The dialog is its own component, `LabWelcome` (`name`, `text`, `about`), for labs on another layout. Not breaking.
- **0.7.0**: LabLayout's top bar is buttons now. It starts with "More labs by Kyle" (was a small "kylepace.dev" link; same `backHref`, new default `backLabel`). A new `lab` prop (`{ name, href }`) puts a "Back to <name>" button on the About page, in place of a lab's own link in the `bar` slot. New `BarButton` component (`info`, `back` or `labs` icon, optional `short` label for narrow phones, `quiet` style). `AboutLink` uses it.
- **0.6.3**: LabLayout's top bar wraps on narrow phones, so a lab's own links plus the About button never scroll the page sideways.
- **0.6.2**: The About button is its own component, `AboutLink` (`import { AboutLink } from 'kp-design'`), for pages that don't use LabLayout's top bar. Looks the same.
- **0.6.1**: The About button says just "About" below 24rem wide, so it fits a 320 px phone.
- **0.6.0**: `LabLayout` takes an `about` prop (the lab's About page). When set, the top bar ends with a clear "About this project" button (an info icon, the lab's own ink, 44 px tall) on every page but the About page itself. Labs that put their own About link in the `bar` slot should switch to the prop. Not breaking.
- **0.5.0**: Analytics skips automated browsers and crawlers (`navigator.webdriver`, headless Chrome, Lighthouse, bots), and tags Kyle's own browsers: opening any page with `?internal=on` sets the user property `internal_user: true` (false for everyone else) and removes the parameter from the address; `?internal=off` clears it. `isAutomated()` and `isInternalBrowser()` are exported for sites with their own analytics code. Not breaking.
- **0.4.3**: the scroll reveal's fade finishes once the first 4rem of an element is on screen, so tall sections no longer sit half-faded (and under the contrast minimum) while in view.
- **0.4.2**: kylepace.dev's nav and footer link to Kyle's resume (kylepace.net/resume/, which forwards to the PDF), shown in the accent color like on kylepace.net.
- **0.4.1**: `LabLayout`'s back link uses the text face instead of monospace, and its footer lists its links instead of joining them with middle dots.
- **0.4.0**: `LabLayout`, a shell for standalone experiments: no site header or nav, a small "kylepace.dev" back link in the upper left (with a `bar` slot for the lab's own things on the right), a one-line footer, display settings and analytics. It imports the new `lab.css` instead of `global.css`: fonts, tokens as defaults, the display settings' rules and a reset, with no site layout or prose styles, so each lab sets its own look by overriding the tokens. The display settings' rules moved into `display-settings.css`, which `global.css` imports; nothing changes for sites.
- **0.3.4**: The kylepace.dev Labs link goes to the new Labs page (`/labs/`) instead of the home page, so the tab lights up there and home can be an overview.
- **0.3.3**: Nav links sit a little closer on phones 360px wide and under, so five links fit on one line.
- **0.3.2**: kylepace.dev's header uses the same "Kyle Pace" name as kylepace.net instead of the monospace `kylepace.dev` wordmark, so the name and site switch don't move when you swap sites. `Header` still supports `mono` and `suffix`.
- **0.3.1**: One `--gutter` token (1.5rem, 1rem on phones) for the header, main and footer, so on phones the header lines up with the page instead of sitting 8px further in. Less space above the page on phones.
- **0.3.0**: A site switch in `Header` (`sites` prop, with `sitesFor('net' | 'dev')` from `kp-design/sites`): two links beside the wordmark for jumping between kylepace.net and kylepace.dev. `DevLayout` uses it, so the kylepace.dev nav drops its kylepace.net link and becomes Labs, Apps, How I build; the footer gains Now. Not breaking: sites that don't pass `sites` look the same.
- **0.2.1**: `Header` links take an optional `hint`, read by screen readers only.
- **0.2.0**: `DevLayout` (the kylepace.dev page shell), shared analytics (`kp-design/analytics`) and the kylepace.dev nav, footer and Amplitude settings in one place (`kp-design/kylepace-dev`). Adding a link to the kylepace.dev header or footer is now one change here.
- **0.1.0**: First version, pulled out of kylepace.net and kylepace.dev.
