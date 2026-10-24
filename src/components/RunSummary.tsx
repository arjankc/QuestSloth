import { levelInfo, type RunOutcome, type RunResult } from '../lib/progress'

type RunSummaryProps = {
  result: RunResult
  bossName: string
  onRematch: () => void
  onLobby: () => void
}

const OUTCOME_COPY: Record<
  RunOutcome,
  { kicker: string; title: (boss: string) => string; body: string }
> = {
  won: {
    kicker: 'Victory',
    title: (boss) => `${boss} falls!`,
    body: 'A flawless run — every answer landed and the dungeon is quieter for it.',
  },
  escaped: {
    kicker: 'The boss escapes',
    title: (boss) => `${boss} slips away`,
    body: 'You survived, but the boss still had HP left. All five answers must land to finish it.',
  },
  defeated: {
    kicker: 'Defeat',
    title: () => 'You were defeated…',
    body: 'Your HP ran out before the boss fell. Take the explanations and run it again.',
  },
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]/50 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
        {label}
      </p>
      <p className="font-display text-[11px] leading-relaxed text-[var(--color-parchment)]">
        {value}
      </p>
    </div>
  )
}

export function RunSummary({ result, bossName, onRematch, onLobby }: RunSummaryProps) {
  const copy = OUTCOME_COPY[result.outcome]
  const level = levelInfo(result.progress.xp)
  const leveledUp = result.levelAfter > result.levelBefore

  return (
    <div className="mx-auto max-w-xl">
      <div className="panel space-y-5 p-6 text-center sm:p-8">
        <p className="font-display text-[9px] text-[var(--color-ember)]">{copy.kicker}</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{copy.title(bossName)}</h1>
        <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
          {copy.body}
        </p>

        <div className="flex items-baseline justify-center gap-3">
          <span className="font-display text-2xl text-[var(--color-parchment)]">
            {result.score.toLocaleString()}
          </span>
          <span className="text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
            points
          </span>
          {result.newBest && (
            <span className="border-2 border-[var(--color-moss-bright)] px-2 py-1 font-display text-[7px] text-[var(--color-moss-bright)]">
              new best
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-3">
          <Stat label="XP earned" value={`+${result.xpGained}`} />
          <Stat label="Accuracy" value={`${result.correct} / ${result.total}`} />
          <Stat label="Best streak" value={`${result.bestStreak}×`} />
        </div>

        {result.flawless && (
          <p className="border-2 border-[var(--color-ember)] bg-[color-mix(in_srgb,var(--color-ember)_14%,transparent)] px-3 py-2 font-display text-[8px] leading-relaxed text-[var(--color-ember-bright)]">
            flawless victory · +500 bonus
          </p>
        )}

        <div className="space-y-2 text-left">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold">Level {level.level}</span>
            <span className="tabular-nums text-[color-mix(in_srgb,var(--color-parchment)_60%,transparent)]">
              {level.into} / {level.span} XP
            </span>
          </div>
          <div className="h-3 overflow-hidden border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]">
            <div
              className="h-full bg-[var(--color-moss-bright)] transition-all duration-500"
              style={{ width: `${level.pct}%` }}
            />
          </div>
          {leveledUp && (
            <p className="combo-badge font-display text-[8px] text-[var(--color-moss-bright)]">
              level up — {result.levelBefore} → {result.levelAfter}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:justify-center">
          <button type="button" className="btn-primary" onClick={onRematch}>
            Rematch
          </button>
          <button type="button" className="btn-secondary" onClick={onLobby}>
            Back to lobby
          </button>
        </div>

        <p className="text-[11px] text-[color-mix(in_srgb,var(--color-parchment)_50%,transparent)]">
          Personal best {result.progress.bestScore.toLocaleString()} · Runs {result.progress.runs} ·
          Wins {result.progress.wins}
        </p>
      </div>
    </div>
  )
}
