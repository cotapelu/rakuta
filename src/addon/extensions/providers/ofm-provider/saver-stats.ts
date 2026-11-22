/**
 * What the token saver last measured, per lane, for `/ofm saver stats`.
 *
 * Process-local on purpose: it is a reading of the most recent request, not a
 * telemetry store. The byte counts describe the payload that actually shipped,
 * so they answer "is the saver doing anything right now" without any of the
 * machinery a usage dashboard would need. One slot per provider, overwritten on
 * each turn — a stale reading is not a wrong one, it is an old one.
 *
 * @module pi-extension/saver-stats.js
 */

import type { RtkStats } from './token-saver/index.js'
import { PROVIDER_ID as OPENECODE_ID } from './opencode.js'
import { PROVIDER_ID as KILO_ID } from './kilo.js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/** What one lane last reported. */
export interface LaneSavings {
  at: number
  stats: RtkStats
}

const STATS_FILE = join(homedir(), '.piclaw', 'saver-stats.json')

/** `provider id -> last reading`. */
const readings = new Map<string, LaneSavings>()

/** Load persisted stats from disk (best-effort). */
function loadPersisted(): void {
  try {
    const raw = readFileSync(STATS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, LaneSavings>
    for (const [provider, reading] of Object.entries(parsed)) {
      if (reading && typeof reading.at === 'number' && reading.stats) {
        readings.set(provider, reading)
      }
    }
  } catch {
    // No file or invalid — start empty
  }
}

/** Persist stats to disk (best-effort). */
function persistStats(): void {
  try {
    const obj: Record<string, LaneSavings> = {}
    for (const [provider, reading] of readings) {
      obj[provider] = reading
    }
    mkdirSync(join(homedir(), '.piclaw'), { recursive: true })
    writeFileSync(STATS_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch {
    // Best-effort; don't crash on write failure
  }
}

// Load on module init
loadPersisted()

/** Replace the reading for one lane. Called from the lane's `onPayload`. */
export function recordSavings(provider: string, stats: RtkStats) {
  readings.set(provider, { at: Date.now(), stats })
  persistStats()
}

/** The reading for one lane, or undefined when it has not sent a request yet. */
export function lastSavings(provider: string): LaneSavings | undefined {
  return readings.get(provider)
}

/** Every reading, in a stable order (`/ofm saver stats` walks this). */
export function allSavings(): Array<{ provider: string; reading: LaneSavings }> {
  const out = []
  for (const provider of [KILO_ID, OPENECODE_ID]) {
    const reading = readings.get(provider)
    if (reading !== undefined) out.push({ provider, reading })
  }
  return out
}
