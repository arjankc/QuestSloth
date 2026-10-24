import {
  CreateMLCEngine,
  type InitProgressReport,
  type MLCEngine,
} from '@mlc-ai/web-llm'
import type { QuestPack } from '../types/quest'
import { MAX_NOTES_CHARS } from '../types/quest'
import { parseQuestPack, questJsonSchema } from './questSchema'

/** Same Gemma 2 2B IT weights; 1k context fits ~4GB VRAM + browser chrome */
export const MODEL_ID = 'gemma-2-2b-it-q4f16_1-MLC-1k'
export const MODEL_LABEL = 'Gemma 2 2B IT (WebLLM q4f16, 1k context)'

let enginePromise: Promise<MLCEngine> | null = null
let engine: MLCEngine | null = null

export type LoadProgress = {
  progress: number
  text: string
}

export async function hasWebGPU(): Promise<boolean> {
  if (!navigator.gpu) return false
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export function isEngineReady() {
  return engine !== null
}

export async function loadEngine(
  onProgress?: (report: LoadProgress) => void,
): Promise<MLCEngine> {
  if (engine) return engine
  if (enginePromise) return enginePromise

  const supported = await hasWebGPU()
  if (!supported) {
    throw new Error(
      'WebGPU is required to run Gemma in the browser. Use recent Chrome or Edge.',
    )
  }

  enginePromise = CreateMLCEngine(MODEL_ID, {
    initProgressCallback: (report: InitProgressReport) => {
      onProgress?.({
        progress: report.progress,
        text: report.text,
      })
    },
  })
    .then((created) => {
      engine = created
      return created
    })
    .catch((err) => {
      enginePromise = null
      throw err
    })

  return enginePromise
}

function buildSystemPrompt() {
  return `You are QuestSloth Teacher Forge. Convert lecture notes into a gamified dungeon quiz pack.
Reply with ONLY valid JSON matching this schema (no markdown, no commentary):
{
  "questTitle": string,
  "bossName": string,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctAnswerIndex": 0|1|2|3,
      "explanation": string
    }
  ]
}
Rules:
- Exactly 5 questions.
- Exactly 4 options per question.
- correctAnswerIndex is the 0-based index of the right option.
- Explanations teach the concept briefly.
- Theme names like a playful dungeon (boss + quest title).
- Base every question on the provided notes.`
}

function buildUserPrompt(notes: string) {
  const clipped = notes.trim().slice(0, MAX_NOTES_CHARS)
  return `Lecture notes:\n"""\n${clipped}\n"""\n\nGenerate the quest pack JSON now.`
}

async function completeJson(mlc: MLCEngine, notes: string, repairHint?: string) {
  const userContent = repairHint
    ? `${buildUserPrompt(notes)}\n\nPrevious output was invalid: ${repairHint}\nReturn corrected JSON only.`
    : buildUserPrompt(notes)

  const reply = await mlc.chat.completions.create({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userContent },
    ],
    temperature: 0.15,
    max_tokens: 900,
    response_format: {
      type: 'json_object',
      schema: JSON.stringify(questJsonSchema),
    },
  })

  const content = reply.choices[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('Model returned an empty response')
  }
  return content
}

export async function generateQuestPack(
  notes: string,
  onProgress?: (report: LoadProgress) => void,
): Promise<QuestPack> {
  if (!notes.trim()) {
    throw new Error('Paste some lecture notes first.')
  }

  const mlc = await loadEngine(onProgress)
  let raw = await completeJson(mlc, notes)

  try {
    return parseQuestPack(raw)
  } catch (firstError) {
    const hint =
      firstError instanceof Error ? firstError.message : 'schema mismatch'
    raw = await completeJson(mlc, notes, hint)
    return parseQuestPack(raw)
  }
}
