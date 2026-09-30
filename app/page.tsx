'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity, AlertTriangle, ArrowUpRight, Boxes, CalendarDays, Check, CheckCircle2, ChevronRight, ClipboardCheck, Download,
  Factory, Files, FlaskConical, HelpCircle, Landmark, LayoutDashboard, Loader2, Package, Plus, RefreshCw, Route, Search,
  ShieldCheck, ShoppingCart, Truck, Users, Wallet, Wrench,
} from 'lucide-react';
import { actions, batchCost, flows, modules, types, type Row, type State } from '@/lib/erp';
import { ThemeToggle } from '@/components/theme-toggle';
import { FormField, MetricCard, Picker, RecordsTable, StatusBadge, fmt, moduleLabel, money } from '@/components/erp/parts';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard, products: FlaskConical, suppliers: Users, procurement: ShoppingCart, inventory: Boxes,
  planning: CalendarDays, batches: Factory, packaging: Package, qc: ClipboardCheck, qa: ShieldCheck, equipment: Wrench,
  sales: Truck, recalls: Route, finance: Wallet, documents: Files, regulatory: Landmark, audit: Activity,
};
const groups = [
  { label: 'Workspace', keys: ['dashboard'] },
  { label: 'Manufacturing', keys: ['products', 'planning', 'batches', 'packaging', 'equipment'] },
  { label: 'Supply chain', keys: ['procurement', 'suppliers', 'inventory', 'sales'] },
  { label: 'Quality & governance', keys: ['qc', 'qa', 'recalls', 'documents', 'regulatory'] },
  { label: 'Business', keys: ['finance', 'audit'] },
];
const pipelineStages = [
  { status: 'Planned', icon: CalendarDays, bar: 'bg-status-neutral-dot' },
  { status: 'In production', icon: Factory, bar: 'bg-status-active-dot' },
  { status: 'Awaiting QC', icon: FlaskConical, bar: 'bg-status-warn-dot' },
  { status: 'Released', icon: CheckCircle2, bar: 'bg-status-ok-dot' },
];
const DIALOG_ACTIONS = ['Record next step', 'Transfer', 'Activate recall', 'Reject', 'Fail', 'Dispatch', 'Return', 'Release'];
const DANGER_ACTIONS = ['Reject', 'Fail', 'Activate recall'];

export default function Page() {
  const [state, setState] = useState<State | null>(null);
  const [version, setVersion] = useState(0);
  const [page, setPage] = useState('dashboard');
  const [role, setRole] = useState('Operations');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [type, setType] = useState('All');
  const [selected, setSelected] = useState<{ module: string; id: string } | null>(null);
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [trace, setTrace] = useState('BTH-2601');
  const [help, setHelp] = useState(false);

  const load = async () => {
    try {
      setError('');
      const r = await fetch('/api/erp');
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setState(d.state);
      setVersion(d.version);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  useEffect(() => {
    load();
    const h = location.hash.slice(1);
    if (modules[h] || h === 'audit') setPage(h);
  }, []);

  const nav = (p: string) => {
    setPage(p);
    setSearch('');
    setFilter('All');
    setType('All');
    location.hash = p;
  };

  // Optional WebMCP hook: lets an in-browser agent open modules without changing records.
  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: 'navigate_erp_module',
          description: 'Open an ERP module without changing records',
          inputSchema: { type: 'object', properties: { module: { type: 'string', enum: ['dashboard', ...Object.keys(modules), 'audit'] } }, required: ['module'], additionalProperties: false },
          annotations: { readOnlyHint: true },
          execute: async (input: any) => {
            if (!modules[input.module] && !['dashboard', 'audit'].includes(input.module)) throw Error('Unknown module');
            nav(input.module);
            return { module: input.module };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => {});
    return () => controller.abort();
  }, []);

  const save = async (module: string, action: string, recordId?: string, data: any = {}) => {
    setBusy(true);
    try {
      const r = await fetch('/api/erp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module, action, recordId, data, role, version }),
      });
      const d: any = await r.json();
      if (!r.ok) throw Error(d.error);
      setState(d.state);
      setVersion(d.version);
      setForm(null);
      toast.success(action === 'Create' ? 'Record created' : action === 'Edit' ? 'Changes saved' : action + ' completed');
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const records = state?.records || {};
  const lookup = (m: string, id: string) => records[m]?.find((x) => x.id === id);
  const record = selected ? lookup(selected.module, selected.id) : undefined;
  const open = (module: string, r: Row) => setSelected({ module, id: r.id });

  const newForm = (module: string, row?: Row, revision = false) => {
    const data: any = row ? { ...row } : {};
    for (const f of modules[module].fields) if (!data[f.key] && f.options) data[f.key] = f.options[0];
    if (revision) {
      data.name = row!.name + ' (revision)';
      data.version = String(Number(row!.version || 1) + 1);
    }
    setForm({ module, action: row && !revision ? 'Edit' : 'Create', id: row && !revision ? row.id : undefined, data });
  };
  const doAction = (module: string, r: Row, a: string) => {
    if (DIALOG_ACTIONS.includes(a)) setForm({ module, action: a, id: r.id, data: {}, name: r.name });
    else save(module, a, r.id);
  };
  const exportRows = (rows: Row[]) => {
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter((k) => rows.some((r) => typeof r[k] !== 'object'));
    const csv = [keys, ...rows.map((r) => keys.map((k) => r[k] ?? ''))]
      .map((row) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(','))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
    a.download = page + '-export.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const allRows = page === 'audit' ? state?.audit || [] : records[page] || [];
  const rows = allRows.filter(
    (r) =>
      JSON.stringify(r).toLowerCase().includes(search.toLowerCase()) &&
      (filter === 'All' || r.status === filter) &&
      (type === 'All' || r.type === type || lookup('products', r.product)?.type === type),
  );
  const module = modules[page];
  const title = page === 'dashboard' ? 'Operations overview' : page === 'audit' ? 'Audit history' : module?.title;
  const description =
    page === 'dashboard' ? 'A clear view of your manufacturing operations.' : page === 'audit' ? 'A chronological record of saved changes and workflow decisions.' : module?.description;

  const alertItems = [
    { title: 'Batches awaiting quality release', count: records.batches?.filter((r) => r.status === 'Awaiting QC').length || 0, module: 'batches', desc: 'Review test results and packaging records', icon: ClipboardCheck },
    { title: 'Open quality investigations', count: records.qa?.filter((r) => r.status !== 'Closed').length || 0, module: 'qa', desc: 'Resolve deviations and corrective actions', icon: ShieldCheck },
    { title: 'Purchase orders in transit', count: records.procurement?.filter((r) => r.status === 'Ordered').length || 0, module: 'procurement', desc: 'Receive materials into quarantine', icon: Truck },
  ];
  const traceBatch = lookup('batches', trace);
  const pendingQc = records.qc?.filter((r) => r.status === 'Pending').length || 0;

  return (
    <SidebarProvider>
      <Toaster position="bottom-right" richColors />

      {/* ---------------- Sidebar ---------------- */}
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-3 pb-1">
          <div className="flex items-center gap-2.5 rounded-lg p-1 group-data-[collapsible=icon]:p-0">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary font-display text-lg font-semibold text-sidebar-primary-foreground">
              p
            </span>
            <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">pharmora</span>
              <span className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70">
                <Factory className="size-3" /> Manufacturing HQ · Demo
              </span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          {groups.map((g) => (
            <SidebarGroup key={g.label} className="py-0.5">
              <SidebarGroupLabel className="h-6 text-sidebar-foreground/60">{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {g.keys.map((k) => {
                  const Icon = icons[k];
                  const active = page === k;
                  return (
                    <SidebarMenuItem key={k}>
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => nav(k)}
                        tooltip={moduleLabel(k)}
                        className="relative data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-0.5 data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-primary"
                      >
                        <Icon className={active ? 'text-sidebar-primary' : undefined} />
                        <span>{moduleLabel(k)}</span>
                      </SidebarMenuButton>
                      {k === 'qc' && pendingQc > 0 && (
                        <SidebarMenuBadge className="rounded-full bg-status-warn text-status-warn-foreground peer-hover/menu-button:text-status-warn-foreground peer-data-[active=true]/menu-button:text-status-warn-foreground">
                          {pendingQc}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-1 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setHelp(true)} tooltip="Prototype guide">
                <HelpCircle />
                <span>Prototype guide</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="pointer-events-none">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">SA</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-medium text-sidebar-accent-foreground">Workspace owner</span>
                  <span className="truncate text-xs text-sidebar-foreground/70">All demo departments</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        {/* ---------------- Top bar ---------------- */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:inline-flex">Workspace</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate font-medium">{moduleLabel(page)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="hidden rounded-full border-transparent bg-status-ok text-status-ok-foreground lg:inline-flex">
              Interactive prototype
            </Badge>
            <ThemeToggle />
            <Picker
              value={role}
              onChange={setRole}
              ariaLabel="Demo role (switch to approve as Quality, Finance or Regulatory)"
              className="w-[132px] sm:w-[150px]"
              options={['Operations', 'Quality', 'Finance', 'Regulatory'].map((value) => ({ value, label: value }))}
            />
            <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh workspace" className="hidden sm:inline-flex">
              <RefreshCw />
            </Button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
          {/* ---------------- Page heading ---------------- */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1.5">
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
                {page === 'dashboard' ? 'Your production, connected' : 'Pharmora workspace'}
              </p>
              <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
              <p className="max-w-2xl text-muted-foreground">{description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {page === 'dashboard' ? (
                <>
                  <Button variant="outline" className="bg-card" onClick={() => nav('recalls')}>
                    <Route /> Trace a batch
                  </Button>
                  <Button onClick={() => newForm('batches')}>
                    <Plus /> New batch
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="bg-card" onClick={() => exportRows(rows)}>
                    <Download /> Export
                  </Button>
                  {page !== 'audit' && (
                    <Button onClick={() => newForm(page)}>
                      <Plus /> New record
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {error ? (
            <Card className="items-center py-14 text-center">
              <span className="flex size-11 items-center justify-center rounded-lg bg-status-bad text-status-bad-foreground">
                <AlertTriangle className="size-5" />
              </span>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Workspace unavailable</h2>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={load}>Try again</Button>
            </Card>
          ) : !state ? (
            <Card className="items-center py-14 text-center">
              <Loader2 className="size-6 animate-spin text-primary" />
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Loading your workspace</h2>
                <p className="text-sm text-muted-foreground">Preparing manufacturing records…</p>
              </div>
            </Card>
          ) : page === 'dashboard' ? (
            <>
              {/* ---------------- Dashboard ---------------- */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard title="Active batches" value={records.batches.filter((r) => ['Planned', 'In production', 'Awaiting QC'].includes(r.status)).length} note="Across 5 manufacturing routes" icon={Factory} />
                <MetricCard title="Awaiting quality release" value={records.batches.filter((r) => r.status === 'Awaiting QC').length} note="Quality approval required" icon={ClipboardCheck} />
                <MetricCard title="Inventory value" value={money(records.inventory.reduce((a, r) => a + Number(r.quantity || 0) * Number(r.cost || 0), 0))} note={records.inventory.length + ' lots across warehouses'} icon={Boxes} />
                <MetricCard
                  title="Open sales orders"
                  value={records.sales.filter((r) => r.status === 'Open').length}
                  note={money(records.sales.filter((r) => r.status === 'Open').reduce((a, r) => a + r.quantity * r.price, 0)) + ' awaiting dispatch'}
                  icon={Truck}
                />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <Card className="gap-0 pb-0">
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Production pipeline</CardTitle>
                    <CardDescription>Live batch status across the plant</CardDescription>
                    <CardAction>
                      <Button variant="link" size="sm" className="px-0" onClick={() => nav('batches')}>
                        View manufacturing <ChevronRight />
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 py-5 md:grid-cols-4">
                    {pipelineStages.map(({ status, icon: Icon, bar }) => (
                      <button
                        key={status}
                        onClick={() => {
                          nav('batches');
                          setFilter(status);
                        }}
                        className="group flex flex-col gap-3 rounded-lg p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-card">
                          <Icon className="size-4" />
                        </span>
                        <span className="font-display text-4xl font-semibold tabular-nums">
                          {records.batches.filter((r) => r.status === status).length.toString().padStart(2, '0')}
                        </span>
                        <span className="text-sm text-muted-foreground">{status}</span>
                        <span className={'h-1 rounded-full ' + bar} />
                      </button>
                    ))}
                  </CardContent>
                  <CardFooter className="gap-2 rounded-b-xl border-t bg-muted/50 py-3 text-sm text-muted-foreground">
                    <ShieldCheck className="size-4 text-primary" /> Quality approval gates protect every finished batch.
                  </CardFooter>
                </Card>

                <Card className="gap-2 pb-2">
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Needs attention</CardTitle>
                    <CardDescription>Items waiting on a decision</CardDescription>
                    <CardAction>
                      <Badge variant="outline" className="rounded-full border-transparent bg-status-warn text-status-warn-foreground">
                        {alertItems.reduce((a, x) => a + x.count, 0)}
                      </Badge>
                    </CardAction>
                  </CardHeader>
                  <div className="flex flex-col px-2">
                    {alertItems.map((a) => (
                      <button
                        key={a.module}
                        onClick={() => nav(a.module)}
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-status-warn text-status-warn-foreground">
                          <a.icon className="size-4" />
                        </span>
                        <span className="grid min-w-0 flex-1">
                          <span className="truncate text-sm font-medium">{a.title}</span>
                          <span className="truncate text-sm text-muted-foreground">{a.desc}</span>
                        </span>
                        <span className="font-display text-lg font-semibold tabular-nums">{a.count}</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </Card>
              </div>

              <Card className="gap-0 overflow-hidden pb-0">
                <CardHeader className="pb-5">
                  <CardTitle className="font-display text-xl">Batch activity</CardTitle>
                  <CardDescription>From production planning to finished goods</CardDescription>
                  <CardAction>
                    <Button variant="link" size="sm" className="px-0" onClick={() => nav('batches')}>
                      View all batches <ChevronRight />
                    </Button>
                  </CardAction>
                </CardHeader>
                <div className="border-t">
                  <RecordsTable module="batches" rows={records.batches.slice(0, 5)} lookup={lookup} onOpen={(r) => open('batches', r)} />
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
                <Card className="gap-2">
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Manufacturing routes</CardTitle>
                    <CardDescription>5 configured process families</CardDescription>
                  </CardHeader>
                  <div className="flex flex-col px-2">
                    {types.map((t, i) => (
                      <button
                        key={t}
                        onClick={() => {
                          nav('products');
                          setType(t);
                        }}
                        className="flex items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      >
                        <span className="font-mono text-xs text-primary">0{i + 1}</span>
                        <span className="grid flex-1">
                          <span className="text-sm font-medium">{t}</span>
                          <span className="text-sm text-muted-foreground">
                            {records.products.filter((p) => p.type === t).length} product · {flows[t].length} process stages
                          </span>
                        </span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="gap-4">
                  <CardHeader>
                    <CardTitle className="font-display text-xl">Recent activity</CardTitle>
                    <CardDescription>Latest saved changes</CardDescription>
                    <CardAction>
                      <Button variant="link" size="sm" className="px-0" onClick={() => nav('audit')}>
                        View log <ArrowUpRight />
                      </Button>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <ol className="relative space-y-5 border-l pl-5">
                      {state.audit.slice(0, 5).map((a) => (
                        <li key={a.id} className="relative">
                          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-status-ok-dot" />
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.role} · {new Date(a.at).toLocaleString()}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <>
              {/* ---------------- Module extras ---------------- */}
              {page === 'recalls' && (
                <Card className="gap-0 pb-0">
                  <CardHeader className="pb-5">
                    <CardTitle className="font-display text-xl">Batch genealogy</CardTitle>
                    <CardDescription>Source lots, quality decisions and customer destinations</CardDescription>
                    <CardAction>
                      <Picker
                        value={trace}
                        onChange={setTrace}
                        ariaLabel="Batch to trace"
                        className="w-[220px]"
                        options={records.batches.map((r) => ({ value: r.id, label: r.id + ' · ' + r.name }))}
                      />
                    </CardAction>
                  </CardHeader>
                  {traceBatch && (
                    <>
                      <CardContent className="grid gap-4 border-t py-5 md:grid-cols-2 xl:grid-cols-4">
                        {[
                          { title: 'Source materials', rows: (traceBatch.consumed || []).map((c: any) => ({ label: lookup('inventory', c.lot)?.name || c.lot, sub: c.lot + ' · ' + fmt(c.quantity) + ' consumed', module: 'inventory', id: c.lot })) },
                          { title: 'Manufacturing batch', rows: [{ label: traceBatch.name, sub: traceBatch.id + ' · ' + traceBatch.status, module: 'batches', id: traceBatch.id }] },
                          {
                            title: 'Quality & packaging',
                            rows: [
                              ...records.qc.filter((r) => r.target === trace).map((r) => ({ label: r.name, sub: r.status, module: 'qc', id: r.id })),
                              ...records.packaging.filter((r) => r.batch === trace).map((r) => ({ label: r.name, sub: r.status, module: 'packaging', id: r.id })),
                            ],
                          },
                          { title: 'Customer shipments', rows: records.sales.filter((r) => r.batch === trace && r.status !== 'Open').map((r) => ({ label: r.name, sub: fmt(r.quantity) + ' · ' + r.status, module: 'sales', id: r.id })) },
                        ].map((g, i) => (
                          <div key={g.title} className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs text-accent-foreground">{i + 1}</span>
                              {g.title}
                            </div>
                            {g.rows.length ? (
                              g.rows.map((r: any) => (
                                <button
                                  key={r.id}
                                  onClick={() => setSelected({ module: r.module, id: r.id })}
                                  className="grid rounded-lg border bg-muted/40 px-3 py-2.5 text-left transition-colors outline-none hover:border-ring/40 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                  <span className="text-sm font-medium">{r.label}</span>
                                  <span className="text-xs text-muted-foreground">{r.sub}</span>
                                </button>
                              ))
                            ) : (
                              <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">No records yet</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                      <CardFooter className="flex-wrap gap-x-6 gap-y-2 rounded-b-xl border-t bg-muted/50 py-3 text-sm text-muted-foreground">
                        <span>
                          Batch cost <strong className="text-foreground">{money(batchCost(traceBatch))}</strong>
                        </span>
                        <span>
                          Available finished stock{' '}
                          <strong className="text-foreground">{fmt(records.inventory.filter((r) => r.batch === trace).reduce((a, r) => a + Number(r.quantity || 0), 0))}</strong>
                        </span>
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-auto px-0"
                          onClick={() => {
                            newForm('recalls');
                            setForm((f: any) => ({ ...f, data: { ...f.data, batch: trace, name: 'Recall assessment · ' + trace } }));
                          }}
                        >
                          Create recall assessment <ChevronRight />
                        </Button>
                      </CardFooter>
                    </>
                  )}
                </Card>
              )}

              {page === 'finance' && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard title="Open receivables" value={money(records.finance.filter((r) => r.kind === 'Receivable' && r.status === 'Open').reduce((a, r) => a + Number(r.amount || 0), 0))} note="Awaiting customer payment" icon={Wallet} />
                    <MetricCard title="Open payables" value={money(records.finance.filter((r) => r.kind === 'Payable' && r.status === 'Open').reduce((a, r) => a + Number(r.amount || 0), 0))} note="Supplier obligations" icon={ShoppingCart} />
                    <MetricCard title="Recorded batch costs" value={money(records.batches.reduce((a, r) => a + batchCost(r), 0))} note="Materials, labour and overhead" icon={Factory} />
                  </div>
                  <Card className="gap-0 overflow-hidden pb-0">
                    <CardHeader className="pb-5">
                      <CardTitle className="font-display text-xl">Batch cost breakdown</CardTitle>
                      <CardDescription>All values in USD</CardDescription>
                    </CardHeader>
                    <div className="border-t">
                      <Table className="[&_td:first-child]:pl-6 [&_td:last-child]:pr-6 [&_th:first-child]:pl-6 [&_th:last-child]:pr-6">
                        <TableHeader className="bg-muted/60 [&_th]:text-muted-foreground">
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Batch</TableHead>
                            <TableHead className="text-right">Materials</TableHead>
                            <TableHead className="text-right">Labour</TableHead>
                            <TableHead className="text-right">Overhead</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Cost / unit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.batches.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="py-3">
                                <div className="font-mono text-xs">{r.id}</div>
                                <div className="text-muted-foreground">{r.name}</div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">{money((r.consumed || []).reduce((a: number, c: any) => a + c.cost, 0))}</TableCell>
                              <TableCell className="text-right tabular-nums">{money(r.labour)}</TableCell>
                              <TableCell className="text-right tabular-nums">{money(r.overhead)}</TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">{money(batchCost(r))}</TableCell>
                              <TableCell className="text-right text-muted-foreground tabular-nums">{r.actual ? '$' + (batchCost(r) / r.actual).toFixed(4) : 'Pending yield'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </>
              )}

              {page === 'planning' && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {records.equipment
                    .filter((r) => r.category === 'Production equipment')
                    .map((e) => {
                      const used = records.planning.filter((p) => p.equipment === e.id && p.status === 'Scheduled').reduce((a, p) => a + Number(p.hours || 0) + Number(p.changeover || 0), 0);
                      return (
                        <Card key={e.id} className="gap-3 py-5">
                          <CardHeader className="px-5">
                            <CardTitle className="text-sm">{e.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {used} of {e.capacity} daily hours scheduled
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3 px-5">
                            <Progress value={Math.min(100, (used / (e.capacity || 16)) * 100)} />
                            <StatusBadge value={e.status} />
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}

              {/* ---------------- Records list ---------------- */}
              <Card className="gap-0 overflow-hidden py-0">
                <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      aria-label="Search records"
                      placeholder={'Search ' + (module?.short.toLowerCase() || 'activity') + '…'}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-card pl-9"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {module && (
                      <Picker
                        value={filter}
                        onChange={setFilter}
                        ariaLabel="Filter by status"
                        className="w-[170px]"
                        options={['All', ...module.statuses].map((value) => ({ value, label: value === 'All' ? 'All statuses' : value }))}
                      />
                    )}
                    {['products', 'batches'].includes(page) && (
                      <Picker
                        value={type}
                        onChange={setType}
                        ariaLabel="Filter by manufacturing type"
                        className="w-[210px]"
                        options={['All', ...types].map((value) => ({ value, label: value === 'All' ? 'All manufacturing types' : value }))}
                      />
                    )}
                    <Badge variant="secondary" className="h-9 rounded-md px-3 font-normal">
                      {rows.length} records
                    </Badge>
                  </div>
                </div>
                <div className="border-t">
                  <RecordsTable
                    module={page}
                    rows={rows}
                    lookup={lookup}
                    onOpen={page === 'audit' ? undefined : (r) => open(page, r)}
                    emptyHint={search || filter !== 'All' ? 'Try changing the search or filter.' : undefined}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-2 border-t bg-muted/40 px-6 py-3 text-sm text-muted-foreground">
                  <span>
                    {rows.length} of {allRows.length} records
                  </span>
                  <span>Changes are saved to your workspace</span>
                </div>
              </Card>
            </>
          )}

          {state && (
            <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-status-ok-dot" />
                Workspace saved · Revision {version}
              </span>
              <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground" onClick={() => setHelp(true)}>
                Demo data · Prototype scope
              </Button>
            </footer>
          )}
        </main>
      </SidebarInset>

      {/* ---------------- Record detail sheet ---------------- */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full gap-0 bg-card sm:max-w-xl" onOpenAutoFocus={(e) => e.preventDefault()}>
          {record && selected && (
            <>
              <SheetHeader className="gap-2 border-b p-6">
                <p className="font-mono text-xs text-muted-foreground">
                  {modules[selected.module].short} / {record.id}
                </p>
                <SheetTitle className="font-display text-2xl font-semibold">{record.name}</SheetTitle>
                <SheetDescription asChild>
                  <div>
                    <StatusBadge value={record.status} />
                  </div>
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-6">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => newForm(selected.module, record)}>
                    Edit record
                  </Button>
                  {['products', 'documents'].includes(selected.module) && (
                    <Button variant="outline" onClick={() => newForm(selected.module, record, true)}>
                      Create revision
                    </Button>
                  )}
                  {actions(selected.module, record).map((a) => (
                    <Button key={a} disabled={busy} variant={DANGER_ACTIONS.includes(a) ? 'destructive' : 'default'} onClick={() => doAction(selected.module, record, a)}>
                      {a}
                    </Button>
                  ))}
                </div>

                <Tabs defaultValue="details" key={record.id}>
                  <TabsList className="w-full">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="related">Linked records</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-5 pt-3">
                    {selected.module === 'batches' && (
                      <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
                        <div className="flex items-center justify-between text-sm">
                          <h3 className="font-medium">Manufacturing progress</h3>
                          <span className="text-muted-foreground tabular-nums">{record.step || 0} / 6</span>
                        </div>
                        <Progress value={((record.step || 0) / 6) * 100} />
                        <ol className="space-y-2">
                          {(flows[lookup('products', record.product)?.type] || []).map((s, i) => {
                            const done = i < (record.step || 0);
                            const current = i === (record.step || 0) && record.status === 'In production';
                            return (
                              <li key={s} className="flex items-start gap-3">
                                <span
                                  className={
                                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs ' +
                                    (done ? 'bg-status-ok text-status-ok-foreground' : current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')
                                  }
                                >
                                  {done ? <Check className="size-3.5" /> : i + 1}
                                </span>
                                <div className="grid flex-1">
                                  <span className={'text-sm ' + (done || current ? 'font-medium' : 'text-muted-foreground')}>{s}</span>
                                  {record.checks?.[i] && <span className="text-xs text-muted-foreground">{record.checks[i].result}</span>}
                                </div>
                                {current && (
                                  <Badge variant="outline" className="border-transparent bg-accent text-accent-foreground">
                                    Current
                                  </Badge>
                                )}
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      {modules[selected.module].fields.map((f) => (
                        <div key={f.key} className={f.kind === 'textarea' ? 'sm:col-span-2' : ''}>
                          <dt className="text-xs text-muted-foreground">{f.label}</dt>
                          <dd className="mt-1 text-sm break-words whitespace-pre-wrap">
                            {f.ref ? lookup(f.ref, record[f.key])?.name || record[f.key] || '—' : String(record[f.key] ?? '—')}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {selected.module === 'batches' && (
                      <div className="flex items-center justify-between rounded-lg bg-accent px-4 py-3 text-sm text-accent-foreground">
                        Recorded batch cost <strong className="font-display text-lg">{money(batchCost(record))}</strong>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="related" className="space-y-2 pt-3">
                    {Object.entries(records).flatMap(([m, rs]) =>
                      rs
                        .filter((r) => r.id !== record.id && [r.batch, r.target, r.product, r.supplier, r.source, r.reference, r.equipment, r.material, r.plan].includes(record.id))
                        .map((r) => (
                          <button
                            key={r.id}
                            onClick={() => open(m, r)}
                            className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                          >
                            <span className="grid flex-1">
                              <span className="text-xs text-muted-foreground">{modules[m].short}</span>
                              <span className="text-sm font-medium">{r.name}</span>
                            </span>
                            <StatusBadge value={r.status} />
                          </button>
                        )),
                    )}
                    {selected.module === 'batches' &&
                      (record.consumed || []).map((c: any) => (
                        <button
                          key={c.lot}
                          onClick={() => setSelected({ module: 'inventory', id: c.lot })}
                          className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        >
                          <span className="grid flex-1">
                            <span className="text-xs text-muted-foreground">Consumed material</span>
                            <span className="text-sm font-medium">
                              {c.lot} · {fmt(c.quantity)}
                            </span>
                          </span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                      ))}
                    <p className="pt-2 text-sm text-muted-foreground">Linked records appear as you progress through the workflow.</p>
                  </TabsContent>

                  <TabsContent value="history" className="pt-3">
                    <ol className="relative space-y-5 border-l pl-5">
                      {state?.audit
                        .filter((a) => a.record === record.id)
                        .map((a) => (
                          <li key={a.id} className="relative">
                            <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-card bg-status-ok-dot" />
                            <p className="text-sm font-medium">{a.name}</p>
                            {a.detail && <p className="text-sm text-muted-foreground">{a.detail}</p>}
                            <p className="text-xs text-muted-foreground">
                              {a.role} · {new Date(a.at).toLocaleString()}
                            </p>
                          </li>
                        ))}
                    </ol>
                    <p className="pt-4 text-sm text-muted-foreground">Seeded records have no prior approval history. New actions are recorded here.</p>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ---------------- Create / edit / action dialog ---------------- */}
      <Dialog open={!!form} onOpenChange={(v) => !v && !busy && setForm(null)}>
        <DialogContent className="max-h-[90svh] gap-0 overflow-hidden bg-card p-0 sm:max-w-2xl">
          <DialogHeader className="border-b p-6">
            <DialogTitle className="font-display text-2xl font-semibold">
              {form?.action === 'Create' ? 'New ' + (modules[form.module]?.short.toLowerCase() || 'record') + ' record' : form?.action === 'Edit' ? 'Edit record' : form?.action}
            </DialogTitle>
            <DialogDescription>{form?.name || 'Changes will be recorded in the workspace audit history.'}</DialogDescription>
          </DialogHeader>
          {form && (
            <form
              className="flex min-h-0 flex-col"
              onSubmit={(e) => {
                e.preventDefault();
                save(form.module, form.action, form.id, form.data);
              }}
            >
              <div className="grid gap-4 overflow-y-auto p-6 sm:grid-cols-2">
                {['Create', 'Edit'].includes(form.action) ? (
                  modules[form.module].fields.map((f) => (
                    <FormField key={f.key} field={f} value={form.data[f.key]} records={records} onChange={(v) => setForm({ ...form, data: { ...form.data, [f.key]: v } })} />
                  ))
                ) : form.action === 'Record next step' ? (
                  <>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor="step-result">Step observation</Label>
                      <Textarea
                        id="step-result"
                        required
                        value={form.data.result || ''}
                        onChange={(e) => setForm({ ...form, data: { ...form.data, result: e.target.value } })}
                        placeholder="Record process checks and observations"
                        className="min-h-24"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="step-actual">Actual output</Label>
                      <Input id="step-actual" type="number" min="1" value={form.data.actual || ''} onChange={(e) => setForm({ ...form, data: { ...form.data, actual: e.target.value } })} />
                      <p className="text-xs text-muted-foreground">Required on the final step.</p>
                    </div>
                  </>
                ) : form.action === 'Transfer' ? (
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="transfer-location">Destination warehouse / bin</Label>
                    <Input id="transfer-location" required value={form.data.location || ''} onChange={(e) => setForm({ ...form, data: { location: e.target.value } })} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-4 text-center sm:col-span-2">
                    <span
                      className={
                        'flex size-12 items-center justify-center rounded-full ' +
                        (DANGER_ACTIONS.includes(form.action) ? 'bg-status-bad text-status-bad-foreground' : 'bg-accent text-accent-foreground')
                      }
                    >
                      <ShieldCheck className="size-6" />
                    </span>
                    <p>
                      Confirm <strong>{form.action.toLowerCase()}</strong> for <strong>{form.name}</strong>.
                    </p>
                    <p className="text-sm text-muted-foreground">The system will check the record’s prerequisites before saving this action.</p>
                    <Badge variant="secondary">Acting as: {role} demo role</Badge>
                  </div>
                )}
              </div>
              <DialogFooter className="border-t bg-muted/40 px-6 py-4">
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancel
                </Button>
                <Button disabled={busy} type="submit" variant={DANGER_ACTIONS.includes(form.action) ? 'destructive' : 'default'}>
                  {busy && <Loader2 className="animate-spin" />}
                  {busy ? 'Saving…' : ['Create', 'Edit'].includes(form.action) ? 'Save record' : 'Confirm ' + form.action.toLowerCase()}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ---------------- Prototype guide ---------------- */}
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="max-h-[90svh] overflow-y-auto bg-card sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-semibold">Explore your manufacturing ERP</DialogTitle>
            <DialogDescription>A connected prototype with persistent demonstration records.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 text-sm">
            <section className="space-y-3">
              <h3 className="text-base font-semibold">Try an end-to-end workflow</h3>
              <ol className="space-y-2.5">
                {[
                  'Open Manufacturing and start the Dermacare cream batch.',
                  'Record all six process steps, including actual output on the final step.',
                  'Open its linked quality test. Edit the result, then switch to the Quality role and pass it.',
                  'Update the packaging order with artwork and clearance references, then complete reconciliation.',
                  'Release the batch as Quality. Create a sales order, dispatch it, then trace the batch.',
                ].map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">{i + 1}</span>
                    <span className="pt-0.5">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
            <Separator />
            <section className="space-y-2 text-muted-foreground">
              <h3 className="text-base font-semibold text-foreground">Prototype boundaries</h3>
              <p>All records and workflow actions are demonstrations. Roles are a switchable simulation, not employee authentication. Integrations, electronic signatures, regulatory submissions, instrument feeds and serialization networks are not connected.</p>
              <p>Costing and accounting are simplified. Material consumption uses one primary material per formula; additional ingredient specifications are recorded as text. Sterile and API process checks are illustrative, not validated manufacturing controls.</p>
              <p>Use demonstration data only. This prototype is not a validated system for production use.</p>
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
