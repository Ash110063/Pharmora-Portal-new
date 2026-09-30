import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { seed, mutate, type State } from '@/lib/erp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Workspace = { state: State; version: number };
const location = path.resolve(process.env.PHARMORA_DATA_DIR || 'data', 'workspace.json');
// Single-process demo store. Use a transactional database before scaling to multiple instances.
const cache = globalThis as typeof globalThis & { pharmoraQueue?: Promise<unknown> };
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = (cache.pharmoraQueue || Promise.resolve()).then(operation);
  cache.pharmoraQueue = result.catch(() => undefined);
  return result;
}
async function persist(value: Workspace) {
  await mkdir(path.dirname(location), { recursive: true });
  const temporary = location + '.' + randomUUID() + '.tmp';
  await writeFile(temporary, JSON.stringify(value), 'utf8');
  await rename(temporary, location);
}
async function load(): Promise<Workspace> {
  try { return JSON.parse(await readFile(location, 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    const value = { state: seed(), version: 0 }; await persist(value); return value;
  }
}
export async function GET() {
  try { return await serial(async () => Response.json(await load(), { headers: { 'Cache-Control': 'no-store' } })); }
  catch { return Response.json({ error: 'Workspace unavailable. Check write permissions for the data directory.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    const input = await request.json();
    return await serial(async () => {
      const current = await load();
      if (input.version !== current.version) return Response.json({ error: 'Another change was saved. Refresh and retry.' }, { status: 409 });
      let state: State;
      try { state = mutate(current.state, input); }
      catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
      const next = { state, version: current.version + 1 };
      await persist(next);
      return Response.json(next);
    });
  } catch { return Response.json({ error: 'Could not save. Your inputs have been retained.' }, { status: 503 }); }
}
