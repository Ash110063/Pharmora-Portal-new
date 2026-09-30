# Pharmora ERP · Next.js source

Full 14-module pharmaceutical manufacturing prototype, restyled using the attached Pharmora project's visual theme. Includes dark ink navigation, cool clinical surfaces, deep green controls, locally bundled IBM Plex fonts, light/dark modes, and responsive shared components.

## Run locally

Requires Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000. For a production build:

```bash
npm run build
npm start
```

Checks: `npm run typecheck` and `npm test`.

## Included

Product/formulation management, procurement, suppliers, inventory, planning, manufacturing, packaging, quality control, quality assurance, equipment, sales, traceability/recalls, finance, document/training records, regulatory records, and audit history. Five manufacturing routes share the original workflow engine. Forms, release gates, stock movements, costing, linked records, exports, search and filters remain connected.

Open **Prototype guide** for the end-to-end walkthrough. The moon/sun control switches theme; the initial preference follows your system and explicit choices persist in the browser.

## Data and deployment

The downloadable edition runs directly on Next.js App Router. Demo records are initialized on first access and saved to `data/workspace.json`. Set `PHARMORA_DATA_DIR` to a persistent writable directory if desired. This local file adapter replaces the hosted prototype's Cloudflare D1 adapter; the UI and workflow engine are shared. Existing hosted workspace records are not included.

Use one Node server process with persistent disk for this demo. This file store is not suitable for stateless/serverless or multi-instance deployments. Replace the API storage adapter with a transactional database for those environments. Back up the data directory to retain records; deleting it resets the local demo on next access.

## Source map

- `app/page.tsx`: all module screens, tables, forms, detail panels and navigation.
- `app/globals.css`: centralized theme tokens, light/dark palettes and component styling.
- `components/theme-toggle.tsx`: saved appearance preference.
- `lib/erp.ts`: module definitions, seed records and workflow rules.
- `app/api/erp/route.ts`: version checks and local persistent demo storage.
- `tests/workflow.test.ts`: receipt, quality, production, dispatch and recall checks.

## Prototype boundaries

Roles and regulatory controls are simulations. There is no real employee authentication, electronic signing, external laboratory feed or serialization integration. Costing/accounting and ingredient consumption are simplified. This is a demonstration prototype, not a validated production ERP. Use demonstration data only.
