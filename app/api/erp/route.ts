import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { seed, mutate, type State } from '@/lib/erp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Workspace = { state: State; version: number };

/*
  Storage, picked automatically:
  1. Redis (durable, shared across all visitors) when Upstash / Vercel KV env vars are present:
     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or KV_REST_API_URL + KV_REST_API_TOKEN.
  2. A JSON file otherwise: PHARMORA_DATA_DIR, else ./data locally, else /tmp on Vercel
     (Vercel only allows writes to /tmp, and it resets when the server instance is recycled).
  3. In-memory, if the file can't be written for any other reason, so the demo still loads.
*/
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const REDIS_KEY = process.env.PHARMORA_REDIS_KEY || 'pharmora:workspace';
const dataDir = process.env.PHARMORA_DATA_DIR || (process.env.VERCEL ? '/tmp/pharmora' : 'data');
const location = path.resolve(dataDir, 'workspace.json');

const cache = globalThis as typeof globalThis & { pharmoraQueue?: Promise<unknown>; pharmoraMemory?: Workspace };

// One request at a time per server instance, so version checks and writes don't interleave.
function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = (cache.pharmoraQueue || Promise.resolve()).then(operation);
  cache.pharmoraQueue = result.catch(() => undefined);
  return result;
}

async function redis(command: unknown[]) {
  const response = await fetch(redisUrl!, {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const body: any = await response.json();
  if (!response.ok || body.error) throw Error(body.error || `Redis request failed (${response.status})`);
  return body.result;
}

async function persist(value: Workspace) {
  if (redisUrl && redisToken) {
    await redis(['SET', REDIS_KEY, JSON.stringify(value)]);
    return;
  }
  try {
    await mkdir(path.dirname(location), { recursive: true });
    const temporary = location + '.' + randomUUID() + '.tmp';
    await writeFile(temporary, JSON.stringify(value), 'utf8');
    await rename(temporary, location);
  } catch {
    cache.pharmoraMemory = value; // read-only filesystem: keep the workspace in memory instead
  }
}

async function load(): Promise<Workspace> {
  if (redisUrl && redisToken) {
    const stored = await redis(['GET', REDIS_KEY]);
    if (stored) return JSON.parse(stored);
  } else if (cache.pharmoraMemory) {
    return cache.pharmoraMemory;
  } else {
    try {
      return JSON.parse(await readFile(location, 'utf8'));
    } catch (error) {
      // Missing or unreachable file (ENOENT, EACCES, EROFS, ENOTDIR…): start from the demo seed.
      // Anything else (e.g. corrupted JSON) is a real problem and is reported.
      if (!(error as NodeJS.ErrnoException).code) throw error;
    }
  }
  const value = { state: seed(), version: 0 };
  await persist(value);
  return value;
}

export async function GET() {
  try {
    return await serial(async () => Response.json(await load(), { headers: { 'Cache-Control': 'no-store' } }));
  } catch (error) {
    console.error('Pharmora workspace load failed:', error);
    return Response.json({ error: 'Workspace unavailable. The data store could not be reached.' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json();
    return await serial(async () => {
      const current = await load();
      if (input.version !== current.version) return Response.json({ error: 'Another change was saved. Refresh and retry.' }, { status: 409 });
      let state: State;
      try {
        state = mutate(current.state, input);
      } catch (error) {
        return Response.json({ error: (error as Error).message }, { status: 400 });
      }
      const next = { state, version: current.version + 1 };
      await persist(next);
      return Response.json(next);
    });
  } catch (error) {
    console.error('Pharmora workspace save failed:', error);
    return Response.json({ error: 'Could not save. Your inputs have been retained.' }, { status: 503 });
  }
}
