export const SCORE_PER_HIT = 100
export const COMBO_BONUS = 25
export const FLAWLESS_BONUS = 500
export const WIN_XP_BONUS = 50
export const XP_PER_LEVEL = 500

const STORAGE_KEY = 'questsloth.progress.v1'

export type RunOutcome = 'won' | 'escaped' | 'defeated'

export type Progress = {
  version: 1
  xp: number
  bestScore: number
  bestStreak: number
  runs: number
  wins: number
}

export const EMPTY_PROGRESS: Progress = {
  version: 1,
  xp: 0,
  bestScore: 0,
  bestStreak: 0,
  runs: 0,
  wins: 0,
}

export type LevelInfo = {
  level: number
  into: number
  span: number
  pct: number
}

export type RunInput = {
  outcome: RunOutcome
  score: number
  correct: number
  total: number
  bestStreak: number
  flawless: boolean
}

export type RunResult = RunInput & {
  xpGained: number
  newBest: boolean
  levelBefore: number
  levelAfter: number
  progress: Progress
}

/** Points for a correct answer; `streak` includes the hit being scored. */
export function scoreForHit(streak: number) {
  return SCORE_PER_HIT + COMBO_BONUS * Math.max(0, Math.floor(streak) - 1)
}

export function xpForRun(score: number, outcome: RunOutcome) {
  const base = Math.round(Math.max(0, score) / 10)
  return base + (outcome === 'won' ? WIN_XP_BONUS : 0)
}

export function levelInfo(xp: number): LevelInfo {
  const safe = Math.max(0, Math.floor(xp))
  const into = safe % XP_PER_LEVEL
  return {
    level: 1 + Math.floor(safe / XP_PER_LEVEL),
    into,
    span: XP_PER_LEVEL,
    pct: Math.round((into / XP_PER_LEVEL) * 100),
  }
}

export function recordRun(progress: Progress, run: RunInput): RunResult {
  const xpGained = xpForRun(run.score, run.outcome)
  const next: Progress = {
    version: 1,
    xp: progress.xp + xpGained,
    bestScore: Math.max(progress.bestScore, run.score),
    bestStreak: Math.max(progress.bestStreak, run.bestStreak),
    runs: progress.runs + 1,
    wins: progress.wins + (run.outcome === 'won' ? 1 : 0),
  }
  return {
    ...run,
    xpGained,
    newBest: run.score > progress.bestScore,
    levelBefore: levelInfo(progress.xp).level,
    levelAfter: levelInfo(next.xp).level,
    progress: next,
  }
}

function toCount(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

export function loadProgress(): Progress {
  if (typeof window === 'undefined') return { ...EMPTY_PROGRESS }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY_PROGRESS }
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object') return { ...EMPTY_PROGRESS }
    const obj = data as Record<string, unknown>
    return {
      version: 1,
      xp: toCount(obj.xp),
      bestScore: toCount(obj.bestScore),
      bestStreak: toCount(obj.bestStreak),
      runs: toCount(obj.runs),
      wins: toCount(obj.wins),
    }
  } catch {
    return { ...EMPTY_PROGRESS }
  }
}

export function saveProgress(progress: Progress) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be blocked (private mode, quotas). Records are a bonus, not a requirement.
  }
}
