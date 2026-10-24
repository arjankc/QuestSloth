import { useMemo, useState } from 'react'
import { HpBar } from '../components/HpBar'
import { readQuestFile } from '../lib/download'
import { parseQuestPack } from '../lib/questSchema'
import sampleQuest from '../data/sample-quest.json'
import type { QuestPack } from '../types/quest'
import { DAMAGE_PER_HIT, STARTING_HP } from '../types/quest'

type Stage = 'lobby' | 'battle' | 'won' | 'lost'
type Feedback = {
  correct: boolean
  explanation: string
} | null

export function Dungeon() {
  const [stage, setStage] = useState<Stage>('lobby')
  const [quest, setQuest] = useState<QuestPack | null>(null)
  const [index, setIndex] = useState(0)
  const [playerHp, setPlayerHp] = useState(STARTING_HP)
  const [bossHp, setBossHp] = useState(STARTING_HP)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [shake, setShake] = useState<'player' | 'boss' | null>(null)
  const [flash, setFlash] = useState<'player' | 'boss' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const question = useMemo(
    () => (quest ? quest.questions[index] : null),
    [quest, index],
  )

  function startQuest(pack: QuestPack) {
    setQuest(pack)
    setIndex(0)
    setPlayerHp(STARTING_HP)
    setBossHp(STARTING_HP)
    setFeedback(null)
    setSelected(null)
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

    if (correct) {
      const nextBoss = Math.max(0, bossHp - DAMAGE_PER_HIT)
      setBossHp(nextBoss)
      setShake('boss')
      setFlash('boss')
      setFeedback({ correct: true, explanation: question.explanation })
      window.setTimeout(() => setShake(null), 400)
      window.setTimeout(() => setFlash(null), 450)
      if (nextBoss <= 0) {
        window.setTimeout(() => setStage('won'), 700)
      }
    } else {
      const nextPlayer = Math.max(0, playerHp - DAMAGE_PER_HIT)
      setPlayerHp(nextPlayer)
      setShake('player')
      setFlash('player')
      setFeedback({ correct: false, explanation: question.explanation })
      window.setTimeout(() => setShake(null), 400)
      window.setTimeout(() => setFlash(null), 450)
      if (nextPlayer <= 0) {
        window.setTimeout(() => setStage('lost'), 700)
      }
    }
  }

  function handleNext() {
    if (!quest || !feedback) return
    if (stage === 'won' || stage === 'lost') return
    if (bossHp <= 0) {
      setStage('won')
      return
    }
    if (playerHp <= 0) {
      setStage('lost')
      return
    }
    if (index >= quest.questions.length - 1) {
      setStage(bossHp < playerHp ? 'won' : playerHp <= 0 ? 'lost' : 'won')
      return
    }
    setIndex((i) => i + 1)
    setFeedback(null)
    setSelected(null)
  }

  function resetToLobby() {
    setStage('lobby')
    setQuest(null)
    setFeedback(null)
    setSelected(null)
    setError(null)
  }

  if (stage === 'lobby') {
    return (
      <div className="mx-auto max-w-lg space-y-8">
        <header className="space-y-3 text-center">
          <p className="font-display text-[9px] text-[var(--color-ember)]">
            Student Dungeon
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">Upload a quest. Defeat the boss.</h1>
          <p className="text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
            No AI runs here — just your wits and a quest.json from the Forge. Works on
            low-end phones.
          </p>
        </header>

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
          {error && (
            <p className="text-sm text-[#f0c0c0]">{error}</p>
          )}
        </div>
      </div>
    )
  }

  if (stage === 'won' || stage === 'lost') {
    return (
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className={`panel space-y-4 p-8 ${shake ? 'shake-hit' : ''}`}>
          <p className="font-display text-[10px] text-[var(--color-ember)]">
            {stage === 'won' ? 'Victory' : 'Defeat'}
          </p>
          <h1 className="text-2xl font-bold">
            {stage === 'won'
              ? `${quest?.bossName ?? 'The boss'} falls!`
              : 'You were defeated…'}
          </h1>
          <p className="text-sm text-[color-mix(in_srgb,var(--color-parchment)_70%,transparent)]">
            {stage === 'won'
              ? 'Your answers cut true. Rest, then forge another pack.'
              : 'Study the explanations and try the dungeon again.'}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {quest && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => startQuest(quest)}
              >
                Rematch
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={resetToLobby}>
              Back to lobby
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!quest || !question) return null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1 text-center">
        <p className="font-display text-[9px] text-[var(--color-ember)]">
          {quest.questTitle}
        </p>
        <h1 className="text-xl font-bold sm:text-2xl">vs {quest.bossName}</h1>
        <p className="text-xs text-[color-mix(in_srgb,var(--color-parchment)_55%,transparent)]">
          Question {index + 1} / {quest.questions.length}
        </p>
      </header>

      <div
        className={`panel space-y-4 p-5 ${shake === 'player' || shake === 'boss' ? 'shake-hit' : ''}`}
      >
        <HpBar
          label="You"
          hp={playerHp}
          maxHp={STARTING_HP}
          variant="player"
          flash={flash === 'player'}
        />
        <HpBar
          label={quest.bossName}
          hp={bossHp}
          maxHp={STARTING_HP}
          variant="boss"
          flash={flash === 'boss'}
        />
      </div>

      <div className="panel space-y-5 p-5 sm:p-6">
        <h2 className="text-lg font-semibold leading-snug">{question.question}</h2>
        <div className="grid gap-3">
          {question.options.map((opt, oi) => {
            const isSelected = selected === oi
            const showResult = Boolean(feedback)
            const isCorrect = oi === question.correctAnswerIndex
            let extra = 'border-[var(--color-panel-edge)] hover:border-[var(--color-moss)]'
            if (showResult && isCorrect) {
              extra = 'border-[var(--color-moss-bright)] bg-[color-mix(in_srgb,var(--color-moss)_25%,transparent)]'
            } else if (showResult && isSelected && !isCorrect) {
              extra = 'border-[var(--color-blood)] bg-[color-mix(in_srgb,var(--color-blood)_25%,transparent)]'
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
            <p className="font-semibold">
              {feedback.correct
                ? `Hit! −${DAMAGE_PER_HIT} boss HP`
                : `Miss! −${DAMAGE_PER_HIT} your HP`}
            </p>
            <p className="text-sm leading-relaxed text-[var(--color-parchment)]">
              {feedback.explanation}
            </p>
            {stage === 'battle' && bossHp > 0 && playerHp > 0 && (
              <button type="button" className="btn-primary" onClick={handleNext}>
                {index >= quest.questions.length - 1 ? 'Finish' : 'Next question'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
