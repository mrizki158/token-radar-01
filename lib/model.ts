// The token launch radar model.
//
// Every tokenless protocol in the snapshot (gecko_id and symbol both null) is
// ranked by an implied launch value built only from the snapshot's own
// figures:
//
//   implied_value = TVL x category_multiple x momentum x maturity
//
// - category_multiple is the median market-cap/TVL ratio of the snapshot's own
//   tokened protocols in the same category, computed at runtime. A category
//   with fewer than 3 tokened peers (or no category) falls back to the global
//   tokened median, so young categories are priced by the whole market
//   instead of by one or two names.
// - momentum reads the protocol's 7-day TVL change: clamped to [-60%, +120%]
//   and mapped linearly onto [0.80, 1.40]; an unreported change is neutral.
// - maturity reads how long DefiLlama has tracked the protocol: a linear
//   ramp from 0.80 on listing day to 1.20 at five years; an unknown listing
//   date is neutral. A launch price should pay for a record that has had
//   time to prove itself, not for a listing that appeared last week.
//
// No protocol name is special-cased anywhere: the same figures always produce
// the same value. Rows sort by implied value, then TVL, then slug, so the
// board is byte-for-byte reproducible.

import { farmStepsFor } from './farm.ts';

export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  farm_steps: string[];
}

export interface RadarRow extends BoardRow {
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  age_days: number | null;
  multiple: number;
  multiple_peers: number;
  multiple_basis: 'category' | 'global';
  momentum: number;
  maturity: number;
  watchlist: boolean;
}

export interface RadarData {
  as_of: string;
  floor_usd: number;
  scanned: number;
  tokened: number;
  global_multiple: number;
  global_peers: number;
  rows: RadarRow[];
}

const MIN_PEERS = 3;
const DAY_MS = 86_400_000;
const MATURITY_RAMP_DAYS = 1825; // five years of record to earn the full factor

export function parseSnapshot(text: string): Snapshot {
  const raw = JSON.parse(text) as Snapshot;
  if (!Array.isArray(raw.protocols) || !Array.isArray(raw.watchlist)) {
    throw new Error('snapshot: protocols and watchlist must be arrays');
  }
  return raw;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export interface MultipleTable {
  byCategory: Map<string, { multiple: number; peers: number }>;
  globalMultiple: number;
  globalPeers: number;
}

/** Median mcap/TVL per category over the snapshot's tokened protocols. */
export function multipleTable(protocols: Protocol[]): MultipleTable {
  const ratiosByCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    all.push(ratio);
    if (p.category !== null) {
      const list = ratiosByCategory.get(p.category) ?? [];
      list.push(ratio);
      ratiosByCategory.set(p.category, list);
    }
  }
  const byCategory = new Map<string, { multiple: number; peers: number }>();
  for (const [category, ratios] of ratiosByCategory) {
    byCategory.set(category, { multiple: median(ratios), peers: ratios.length });
  }
  return { byCategory, globalMultiple: median(all), globalPeers: all.length };
}

/** 7-day TVL change (per cent) mapped onto [0.80, 1.40]; null is neutral. */
export function momentumFactor(change7d: number | null): number {
  if (change7d === null) return 1;
  const clamped = Math.min(120, Math.max(-60, change7d));
  return 1 + clamped / 300;
}

/** Whole days between two YYYY-MM-DD dates, never negative. */
export function ageDays(listedAt: string, asOf: string): number {
  const days = Math.round((Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${listedAt}T00:00:00Z`)) / DAY_MS);
  return Math.max(0, days);
}

/** Track record mapped onto [0.80, 1.20] over five years; unknown is neutral. */
export function maturityFactor(listedAt: string | null, asOf: string): number {
  if (listedAt === null) return 1;
  const age = Math.min(ageDays(listedAt, asOf), MATURITY_RAMP_DAYS);
  return 0.8 + (0.4 * age) / MATURITY_RAMP_DAYS;
}

const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;

export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const table = multipleTable(snapshot.protocols);
  const watchlist = new Set(snapshot.watchlist);
  const tokenless = snapshot.protocols.filter((p) => p.gecko_id === null && p.symbol === null);

  const scored = tokenless.map((p) => {
    const peer = p.category !== null ? table.byCategory.get(p.category) : undefined;
    const useCategory = peer !== undefined && peer.peers >= MIN_PEERS;
    const multiple = useCategory ? peer.multiple : table.globalMultiple;
    const momentum = momentumFactor(p.change_7d);
    const maturity = maturityFactor(p.listed_at, snapshot.as_of);
    const implied = Math.max(1, Math.round(p.tvl_usd * multiple * momentum * maturity));
    return { p, multiple, peers: useCategory ? peer.peers : table.globalPeers, basis: useCategory ? ('category' as const) : ('global' as const), momentum, maturity, implied };
  });

  scored.sort((a, b) => b.implied - a.implied || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : 1));

  const rows: RadarRow[] = scored.map((s, i) => ({
    slug: s.p.slug,
    name: s.p.name,
    rank: i + 1,
    implied_value_usd: s.implied,
    farm_steps: farmStepsFor({ name: s.p.name, category: s.p.category, chains: s.p.chains, tvlUsd: s.p.tvl_usd }),
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    listed_at: s.p.listed_at,
    age_days: s.p.listed_at === null ? null : ageDays(s.p.listed_at, snapshot.as_of),
    multiple: round4(s.multiple),
    multiple_peers: s.peers,
    multiple_basis: s.basis,
    momentum: round4(s.momentum),
    maturity: round4(s.maturity),
    watchlist: watchlist.has(s.p.slug),
  }));

  const board: BoardRow[] = rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    rank: r.rank,
    implied_value_usd: r.implied_value_usd,
    farm_steps: r.farm_steps,
  }));

  const radar: RadarData = {
    as_of: snapshot.as_of,
    floor_usd: snapshot.floor_usd,
    scanned: snapshot.protocols.length,
    tokened: snapshot.protocols.length - tokenless.length,
    global_multiple: round4(table.globalMultiple),
    global_peers: table.globalPeers,
    rows,
  };
  return { board, radar };
}

/** The gate's board rules, checked by the program itself before it writes. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `board holds ${board.length} rows, outside 100-4000`;
  const known = new Set(snapshot.protocols.map((p) => p.slug));
  const seen = new Set<string>();
  let previous = Number.POSITIVE_INFINITY;
  let allEqual = true;
  for (let i = 0; i < board.length; i++) {
    const row = board[i]!;
    if (!known.has(row.slug)) return `row ${i + 1}: slug ${row.slug} is not in the snapshot`;
    if (seen.has(row.slug)) return `slug ${row.slug} appears twice`;
    seen.add(row.slug);
    if (row.rank !== i + 1) return `row ${i + 1}: rank is ${row.rank}, expected ${i + 1}`;
    if (!Number.isInteger(row.implied_value_usd) || row.implied_value_usd <= 0 || row.implied_value_usd > 100_000_000_000_000) {
      return `row ${row.slug}: implied_value_usd ${row.implied_value_usd} is not a positive whole number within the cap`;
    }
    if (row.implied_value_usd > previous) return `row ${row.slug}: implied value rises as rank ascends`;
    if (row.implied_value_usd !== board[0]!.implied_value_usd) allEqual = false;
    previous = row.implied_value_usd;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) return `row ${row.slug}: ${row.farm_steps.length} farm steps, outside 3-12`;
    for (const step of row.farm_steps) {
      const len = step.trim().length;
      if (len < 20 || len > 600) return `row ${row.slug}: a farm step is ${len} characters, outside 20-600`;
    }
  }
  if (allEqual) return 'every implied value is the same: the board ranks nothing';
  for (const slug of snapshot.watchlist) {
    if (!seen.has(slug)) return `watchlist slug ${slug} is missing from the board`;
  }
  return null;
}

/** The dashboard's data as a script the page loads: window.RADAR. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR = ${JSON.stringify(radar)};\n`;
}
