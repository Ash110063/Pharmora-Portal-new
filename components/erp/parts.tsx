'use client';

import type { ComponentType } from 'react';
import { ChevronRight, Layers } from 'lucide-react';
import { modules, type Field, type Row } from '@/lib/erp';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

export const money = (v: unknown) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(v) || 0);
export const fmt = (v: unknown) => Number(v || 0).toLocaleString();

/* ---------- Status ---------- */

type Tone = 'ok' | 'warn' | 'active' | 'neutral' | 'shipped' | 'bad';
const OK = ['Approved', 'Released', 'Passed', 'Ready', 'Completed', 'Paid', 'Acknowledged', 'Closed', 'Converted', 'Received'];
const BAD = ['Rejected', 'Failed', 'Recalled', 'Suspended', 'Expired', 'Out of service', 'Active'];
const WARN = ['Pending', 'Awaiting QC', 'Quarantine', 'Investigating', 'Maintenance', 'Open', 'Under review', 'Submitted'];
const ACTIVE = ['In production', 'In progress', 'In use', 'Ordered', 'Scheduled'];

export function statusTone(value: string): Tone {
  if (value === 'Dispatched') return 'shipped';
  if (ACTIVE.includes(value)) return 'active';
  if (OK.includes(value)) return 'ok';
  if (BAD.includes(value)) return 'bad';
  if (WARN.includes(value)) return 'warn';
  return 'neutral';
}

const toneClass: Record<Tone, string> = {
  ok: 'bg-status-ok text-status-ok-foreground [&>i]:bg-status-ok-dot',
  warn: 'bg-status-warn text-status-warn-foreground [&>i]:bg-status-warn-dot',
  active: 'bg-status-active text-status-active-foreground [&>i]:bg-status-active-dot',
  neutral: 'bg-status-neutral text-status-neutral-foreground [&>i]:bg-status-neutral-dot',
  shipped: 'bg-status-shipped text-status-shipped-foreground [&>i]:bg-status-shipped-dot',
  bad: 'bg-status-bad text-status-bad-foreground [&>i]:bg-status-bad-dot',
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn('rounded-full border-transparent px-2.5 py-0.5', toneClass[statusTone(value)], className)}>
      <i className="size-1.5 rounded-full" aria-hidden />
      {value}
    </Badge>
  );
}

/* ---------- Select wrapper ---------- */

export function Picker({
  value,
  onChange,
  options,
  placeholder = 'Choose an option',
  className,
  id,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} aria-label={ariaLabel} className={cn('bg-card', className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options
          .filter((o) => o.value)
          .map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

/* ---------- Metric card (shadcn dashboard "section card" pattern) ---------- */

export function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  note: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="px-5">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="font-display text-3xl font-semibold tabular-nums">{value}</CardTitle>
        <CardAction>
          <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-4" />
          </span>
        </CardAction>
      </CardHeader>
      <CardFooter className="px-5 text-sm text-muted-foreground">{note}</CardFooter>
    </Card>
  );
}

/* ---------- Records table ---------- */

const QTY = ['inventory', 'batches', 'planning', 'sales', 'procurement'];

export function RecordsTable({
  module,
  rows,
  lookup,
  onOpen,
  emptyHint,
}: {
  module: string;
  rows: Row[];
  lookup: (m: string, id: string) => Row | undefined;
  onOpen?: (r: Row) => void;
  emptyHint?: string;
}) {
  const clickable = module !== 'audit' && !!onOpen;
  const col2 =
    module === 'batches' ? 'Manufacturing type' : module === 'inventory' ? 'Location' : module === 'sales' ? 'Product' : module === 'finance' ? 'Type' : module === 'audit' ? 'Role' : 'Reference';
  const col3 = QTY.includes(module) ? 'Quantity' : module === 'finance' ? 'Amount' : 'Date / owner';

  const second = (r: Row) =>
    module === 'batches'
      ? lookup('products', r.product)?.type
      : module === 'inventory'
        ? r.location || 'Unassigned'
        : module === 'sales'
          ? lookup('products', r.product)?.name
          : module === 'finance'
            ? r.kind
            : module === 'audit'
              ? r.role
              : r.target || r.batch || (r.version && 'Version ' + r.version) || r.category || r.market || (r.product && lookup('products', r.product)?.name) || '—';

  const third = (r: Row) =>
    QTY.includes(module) ? (
      <span className="tabular-nums">
        {fmt(r.quantity)} <span className="text-muted-foreground">{r.unit || lookup('products', r.product)?.unit || ''}</span>
      </span>
    ) : module === 'finance' ? (
      <span className="tabular-nums">{money(r.amount)}</span>
    ) : (
      r.due || r.expiry || r.at?.slice(0, 16).replace('T', ' ') || r.owner || '—'
    );

  return (
    <Table className="[&_td:first-child]:pl-6 [&_td:last-child]:pr-4 [&_th:first-child]:pl-6">
      <TableHeader className="bg-muted/60 [&_th]:text-muted-foreground">
        <TableRow className="hover:bg-transparent">
          <TableHead>{module === 'audit' ? 'Activity' : 'Record'}</TableHead>
          <TableHead className="hidden md:table-cell">{col2}</TableHead>
          <TableHead className="hidden sm:table-cell">{col3}</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10">
            <span className="sr-only">Open</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length ? (
          rows.map((r) => (
            <TableRow key={r.id} onClick={clickable ? () => onOpen!(r) : undefined} className={cn(clickable && 'cursor-pointer')}>
              <TableCell className="py-3">
                <div className="font-medium">{r.name}</div>
                <div className="font-mono text-xs text-muted-foreground">{r.id}</div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{second(r)}</TableCell>
              <TableCell className="hidden sm:table-cell">{third(r)}</TableCell>
              <TableCell>
                <StatusBadge value={r.status} />
              </TableCell>
              <TableCell>
                {clickable && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    aria-label={'Open ' + r.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen!(r);
                    }}
                  >
                    <ChevronRight />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={5}>
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Layers className="size-5" />
                </span>
                <p className="font-medium">No matching records</p>
                <p className="text-sm text-muted-foreground">{emptyHint || 'Create a record to begin this workflow.'}</p>
              </div>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

/* ---------- Form field ---------- */

export function FormField({
  field: f,
  value,
  records,
  onChange,
}: {
  field: Field;
  value: any;
  records: Record<string, Row[]>;
  onChange: (v: any) => void;
}) {
  const id = 'field-' + f.key;
  const options =
    f.options?.map((v) => ({ value: v, label: v })) ||
    (f.ref
      ? records[f.ref]?.map((r) => ({ value: r.id, label: r.id + ' · ' + r.name }))
      : f.kind === 'target'
        ? [...(records.batches || []), ...(records.inventory || [])].map((r) => ({ value: r.id, label: r.id + ' · ' + r.name }))
        : []);
  const wide = f.kind === 'textarea';
  return (
    <div className={cn('grid gap-2', wide && 'sm:col-span-2')}>
      <Label htmlFor={id}>
        <span>
          {f.label}
          {f.key === 'name' && <span className="ml-0.5 text-destructive">*</span>}
        </span>
      </Label>
      {['select', 'ref', 'target'].includes(f.kind) ? (
        <Picker id={id} value={value || ''} onChange={onChange} options={options || []} className="w-full" />
      ) : wide ? (
        <Textarea id={id} value={value || ''} onChange={(e) => onChange(e.target.value)} className="min-h-24 bg-card" />
      ) : (
        <Input
          id={id}
          required={f.key === 'name'}
          type={f.kind}
          min={f.kind === 'number' ? 0 : undefined}
          step={f.kind === 'number' ? 'any' : undefined}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="bg-card"
        />
      )}
    </div>
  );
}

export const moduleLabel = (k: string) => (k === 'dashboard' ? 'Overview' : k === 'audit' ? 'Audit history' : modules[k]?.short || k);
