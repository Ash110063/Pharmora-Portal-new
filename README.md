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

All data is demonstration data from `seed()` in `lib/erp.ts`, served by the app's own API at `/api/erp` (GET loads the workspace, POST applies an action). The API picks its storage automatically:

1. **Redis (recommended on Vercel).** If `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (or Vercel's `KV_REST_API_URL` + `KV_REST_API_TOKEN`) are set, the workspace is stored in Redis. Changes persist and every visitor sees the same records. On Vercel: project → Storage → Create → Upstash Redis → connect to this project, then redeploy.
2. **File.** Otherwise it uses `data/workspace.json` locally, or `/tmp` on Vercel. Set `PHARMORA_DATA_DIR` to choose the folder. On Vercel `/tmp` works but resets whenever the server instance is recycled, so edits are temporary.
3. **Memory.** If the file can't be written at all, the workspace is kept in memory so the demo still loads.

Delete the Redis key `pharmora:workspace` (or the data file) to reset to the demo seed.

`vercel.json` turns off automatic deployments from Git pushes; deploy manually from the Vercel dashboard or with `vercel --prod`.

## Source map

- `app/page.tsx`: all module screens, tables, forms, detail sheet and navigation, built from shadcn/ui components.
- `components/erp/parts.tsx`: shared ERP pieces — status badge, select picker, metric card, records table, form field.
- `components/ui/*`: shadcn/ui primitives (button, card, badge, input, textarea, label, select, table, tabs, sheet, dialog, sidebar, breadcrumb, avatar, progress, tooltip, sonner…).
- `app/globals.css`: the Pharmora palette mapped onto shadcn theme tokens (light + dark), plus workflow status tokens (`bg-status-ok`, `text-status-warn-foreground`, …).
- `components/theme-toggle.tsx`: saved appearance preference.
- `lib/erp.ts`: module definitions, seed records and workflow rules.
- `app/api/erp/route.ts`: version checks and local persistent demo storage.
- `tests/workflow.test.ts`: receipt, quality, production, dispatch and recall checks.

### Theming

Colours live only in `app/globals.css` as shadcn tokens (`--primary`, `--card`, `--sidebar`, …). Components use Tailwind classes such as `bg-card` or `text-muted-foreground`, never hex values, so a palette change is a one-file edit. Dark mode follows `<html data-theme="dark">`, set by next-themes.

## Prototype boundaries

Roles and regulatory controls are simulations. There is no real employee authentication, electronic signing, external laboratory feed or serialization integration. Costing/accounting and ingredient consumption are simplified. This is a demonstration prototype, not a validated production ERP. Use demonstration data only.
