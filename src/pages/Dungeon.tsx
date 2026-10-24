import { useMemo, useRef, useState } from 'react'
import { BattleStage, type HitFx } from '../components/BattleStage'
import { RunSummary } from '../components/RunSummary'
import { readQuestFile } from '../lib/download'
import { parseQuestPack } from '../lib/questSchema'
import {
  FLAWLESS_BONUS,
  levelInfo,
  loadProgress,
  recordRun,
  saveProgress,
  scoreForHit,
  type Progress,
  type RunOutcome,
  type RunResult,
} from '../lib/progress'
import sampleQuest from '../data/sample-quest.json'
import type { QuestPack } from '../types/quest'
import { DAMAGE_PER_HIT, STARTING_HP } from '../types/quest'

type Stage = 'lobby' | 'battle' | 'ended'

type Feedback = {
  correct: boolean
  explanation: string
  points: number
  comboAfter: number
} | null

export function Dungeon() {
  const [stage, setStage] = useState<Stage>('lobby')
  const [quest, setQuest] = useState<QuestPack | null>(null)
  const [index, setIndex] = useState(0)
  const [playerHp, setPlayerHp] = useState(STARTING_HP)
  const [bossHp, setBossHp] = useState(STARTING_HP)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [hit, setHit] = useState<HitFx | null>(null)
  const [pendingEnd, setPendingEnd] = useState<RunOutcome | null>(null)
  const [summary, setSummary] = useState<RunResult | null>(null)
  const [profile, setProfile] = useState<Progress>(() => loadProgress())
  const [error, setError] = useState<string | null>(null)
  const fxId = useRef(0)

  const question = useMemo(
    () => (quest ? quest.questions[index] : null),
    [quest, index],
  )
  const level = levelInfo(profile.xp)

  function startQuest(pack: QuestPack) {
    setQuest(pack)
    setIndex(0)
    setPlayerHp(STARTING_HP)
    setBossHp(STARTING_HP)
    setFeedback(null)
    setSelected(null)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setCorrectCount(0)
    setHit(null)
    setPendingEnd(null)
    setSummary(null)
    setError(null)
    setStage('battle')
  }

  async function handleUpload(file: File | null) {
    if (!file) return
    setError(null)
    try {
      const text = await readQuestFile(file)
      const pack = parseQuestPack(text)
      startQuest(pack)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read quest file')
    }
  }

  function handleAnswer(optionIndex: number) {
    if (!quest || !question || feedback) return
    setSelected(optionIndex)
    const correct = optionIndex === question.correctAnswerIndex
    fxId.current += 1

    if (correct) {
      const comboAfter = combo + 1
      const points = scoreForHit(comboAfter)
      const nextBossHp = Math.max(0, bossHp - DAMAGE_PER_HIT)

      setCombo(comboAfter)
      setBestCombo(Math.max(bestCombo, comboAfter))
      setScore(score + points)
      setCorrectCount(correctCount + 1)
      setBossHp(nextBossHp)
      setHit({
        id: fxId.current,
        side: 'boss',
        amount: DAMAGE_PER_HIT,
        combo: comboAfter,
        scoreGained: points,
        killing: nextBossHp <= 0,
      })
      setFeedback({
        correct: true,
        explanation: question.explanation,
        points,
        comboAfter,
      })
      setPendingEnd(nextBossHp <= 0 ? 'won' : null)
    } else {
      const nextPlayerHp = Math.max(0, playerHp - DAMAGE_PER_HIT)

      setCombo(0)
      setPlayerHp(nextPlayerHp)
      setHit({
        id: fxId.current,
        side: 'player',
        amount: DAMAGE_PER_HIT,
        combo: 0,
        scoreGained: 0,
        killing: nextPlayerHp <= 0,
      })
      setFeedback({
        correct: false,
        explanation: question.explanation,
        points: 0,
        comboAfter: 0,
      })
      setPendingEnd(nextPlayerHp <= 0 ? 'defeated' : null)
    }
  }

  function finishRun(outcome: RunOutcome) {
    if (!quest) return
    const flawless = outcome === 'won'
    const finalScore = score + (flawless ? FLAWLESS_BONUS : 0)
    const result = recordRun(profile, {
      outcome,
      score: finalScore,
      correct: correctCount,
      total: quest.questions.length,
      bestStreak: bestCombo,
      flawless,
    })
    saveProgress(result.progress)
    setProfile(result.progress)
    setSummary(result)
    setStage('ended')
  }

  function handleNext() {
    if (!quest || !feedback) return
    if (pendingEnd) {
      finishRun(pendingEnd)
      return
    }
    if (index >= quest.questions.length - 1) {
      finishRun('escaped')
      return
    }
    setIndex(index + 1)
    setFeedback(null)
    setSelected(null)
    setHit(null)
  }

  function resetToLobby() {
    setStage('lobby')
    setQuest(null)
    setFeedback(null)
    setSelected(null)
    setHit(null)
    setPendingEnd(null)
    setSummary(null)
    setError(null)
  }

  if (stage === 'lobby') {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3 text-center">
          <p className="font-display text-[9px] text-[var(--color-ember)]">
            Student Dungeon
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Upload a quest. Defeat the boss.</h1>
          <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
            No AI runs here — just your wits and a quest.json from the Forge. Chain correct
            answers into combos for score, earn XP, and keep the boss from escaping.
          </p>
        </header>

        <div className="panel space-y-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-display text-[8px] text-[var(--color-ember)]">
              Delver record
            </span>
            <span className="font-display text-[8px] text-[var(--color-moss-bright)]">
              Level {level.level}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden border-2 border-[var(--color-panel-edge)] bg-[#0d0b09]">
            <div
              className="h-full bg-[var(--color-moss-bright)] transition-all duration-500"
              style={{ width: `${level.pct}%` }}
            />
          </div>
          <div className="flex items-baseline justify-between text-[11px] text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
            <span>
              {level.into} / {level.span} XP
            </span>
            <span className="tabular-nums">
              Best {profile.bestScore.toLocaleString()} · Streak {profile.bestStreak}× · Runs{' '}
              {profile.runs}
            </span>
          </div>
        </div>

        <div className="panel space-y-5 p-6">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Quest file</span>
            <input
              type="file"
              accept="application/json,.json"
              className="block w-full text-sm file:mr-3 file:border-0 file:bg-[var(--color-moss)] file:px-3 file:py-2 file:font-semibold file:text-[var(--color-parchment)]"
              onChange={(e) => void handleUpload(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="relative text-center text-xs text-[color-mix(in_srgb,var(--color-parchment)_45%,transparent)]">
            <span className="bg-[var(--color-panel)] px-2">or</span>
            <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-[var(--color-panel-edge)]" />
          </div>
          <button
            type="button"
            className="btn-primary w-full"
            onClick={() => startQuest(sampleQuest as QuestPack)}
          >
            Play sample quest
          </button>
          {error && <p className="text-sm text-[#f0c0c0]">{error}</p>}
        </div>
      </div>
    )
  }

  if (stage === 'ended' && summary) {
    return (
      <RunSummary
        result={summary}
        bossName={quest?.bossName ?? 'The boss'}
        onRematch={() => quest && startQuest(quest)}
        onLobby={resetToLobby}
      />
    )
  }

  if (!quest || !question) return null

  const isLastQuestion = index >= quest.questions.length - 1
  const ctaLabel =
    pendingEnd === 'won'
      ? 'Claim victory'
      : pendingEnd === 'defeated'
        ? 'Accept defeat'
        : isLastQuestion
          ? 'See results'
          : 'Next question'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="space-y-1 text-center">
        <p className="font-display text-[9px] text-[var(--color-ember)]">
          {quest.questTitle}
        </p>
        <h1 className="text-xl font-bold sm:text-2xl">vs {quest.bossName}</h1>
        <p className="text-xs text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
          Question {index + 1} / {quest.questions.length}
        </p>
      </header>

      <BattleStage
        bossName={quest.bossName}
        playerHp={playerHp}
        bossHp={bossHp}
        maxHp={STARTING_HP}
        score={score}
        combo={combo}
        hit={hit}
      />

      <div className="panel space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold leading-snug">{question.question}</h2>
        <div className="grid gap-3">
          {question.options.map((opt, oi) => {
            const isSelected = selected === oi
            const showResult = Boolean(feedback)
            const isCorrect = oi === question.correctAnswerIndex
            let extra = 'border-[var(--color-panel-edge)] hover:border-[var(--color-moss)]'
            if (showResult && isCorrect) {
              extra =
                'border-[var(--color-moss-bright)] bg-[color-mix(in_srgb,var(--color-moss)_25%,transparent)]'
            } else if (showResult && isSelected && !isCorrect) {
              extra =
                'border-[var(--color-blood)] bg-[color-mix(in_srgb,var(--color-blood)_25%,transparent)]'
            }

            return (
              <button
                key={oi}
                type="button"
                disabled={Boolean(feedback)}
                onClick={() => handleAnswer(oi)}
                className={`w-full border-3 px-4 py-3 text-left text-sm transition ${extra} disabled:cursor-default`}
              >
                <span className="mr-2 font-semibold text-[var(--color-ember)]">
                  {String.fromCharCode(65 + oi)}.
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {feedback && (
          <div
            className={`space-y-3 border-t border-[var(--color-panel-edge)] pt-4 ${
              feedback.correct ? 'text-[var(--color-moss-bright)]' : 'text-[#f0c0c0]'
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-semibold">
                {feedback.correct
                  ? `Hit! −${DAMAGE_PER_HIT} boss HP`
                  : `Miss! −${DAMAGE_PER_HIT} your HP`}
              </p>
              {feedback.correct && feedback.comboAfter >= 2 && (
                <p className="font-display text-[8px] text-[var(--color-ember-bright)]">
                  {feedback.comboAfter}× combo · +{feedback.points} pts
                </p>
              )}
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-parchment)]">
              {feedback.explanation}
            </p>
            <button type="button" className="btn-primary" onClick={handleNext}>
              {ctaLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
