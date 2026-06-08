# G-Cleanser — Frontend

Working React frontend built from `prototype/G-Cleanser_Prototype.html`.
A music-catalog data-cleansing platform: one messy catalog in → one trusted,
de-duplicated master out — cleaned automatically where confident, by a human
where not, with every user's work in its own isolated branch.

## Run

```bash
npm install
npm run dev      # http://localhost:5174
npm run build    # production build → dist/
npm run preview  # serve the build
```

## Stack

Vite + React 18. Mock data + `localStorage` persistence (no backend).
Fonts: Public Sans / Lato / JetBrains Mono. Purple brand theme with full
light + **dark mode**, oklch design tokens in `src/styles.css`.

## Sign in

The app opens on a **sign-in only** screen (no sign-up / no demo chips). The
password field has a show/hide toggle. Use a seeded account:

| Email | Password |
|---|---|
| vishal@goongoonalo.com | demo1234 |
| anya@goongoonalo.com | demo1234 |
| dev@goongoonalo.com | demo1234 |

## Folders & files

```
styles/
  styles.css                  design system + light/dark themes
src/
  main.jsx                    entry — mounts <App/>, loads ../styles/styles.css
  App.jsx                     shell: auth gate, routing, store, resizable
                              sidebar, topbar (theme toggle), modals, tweaks
  data/
    mockData.js               seed users, datasets, presets, branches, review rows
  components/
    ui.jsx                    Icon, Avatar, StatusPill, OwnerDot, Modal, helpers
    TweaksPanel.jsx           floating Tweaks panel (accent / density / headings)
  screens/
    Authentication.jsx        sign in (with password reveal)
    BranchDashboard.jsx       account banner + your / others' branch cards
    CrossBranchBrowser.jsx    read-only browse + cherry-pick / adopt
    BranchSetupWizard.jsx     upload → primary key → preset / custom
    PipelineRun.jsx           animated 7-step pipeline
    IssuesScoring.jsx         confidence histogram + issue triage
    ReviewQueue.jsx           bulk review table
    MasterTalent.jsx          trusted master + talent summary
    Exports.jsx               full / label / artist file generation
    helpers.jsx               shared StatCard / PageHead / outputColumns
```

Each component lives in a file named for it (component `BranchDashboard` →
`BranchDashboard.jsx`, etc.). The stylesheet is in the top-level `styles/`
folder and imported from `src/main.jsx`.

## Key flows

- **Auth** — sign in only (password show/hide); switch account & sign out from the sidebar.
- **New branch wizard** — name modal → **real file upload** (drag/drop or browse;
  CSV/XLSX only, ≤20 MB; headers parsed in-browser via SheetJS, with 0 KB / wrong-type /
  corrupt / >20 MB rejection) → common-column primary-key picker → 9 presets + custom builder.
- **Pipeline** — animates steps 1–5, halts at the human gate, builds the master on submit.
- **Review** — one bulk table of sub-100% records; inline edit, apply-suggested,
  multi-select delete, submit to seal.
- **Branching** — per-user isolated branches; read-only cross-branch browsing;
  cherry-pick (adopt) decisions with provenance, never auto-merged.
- **Theme** — light/dark toggle (top bar). **Tweaks** — gear button (bottom-right):
  accent palette, density, heading font.

State persists to `localStorage` (`gcleanser_proto_v1`); theme to `gc-theme`.
