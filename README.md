# QuestSloth

**Turn lecture notes into a dungeon-crawler quiz — entirely in the browser.**

Built for [Hacktoberfest Open-Source AI Challenge: Week 3 — Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19). Teachers paste notes; local **Gemma 2 2B** (via [WebLLM](https://webllm.mlc.ai/)) forges a `quest.json`. Students upload that pack and fight the boss by answering — no inference on the play path, so phones stay happy.

## Why open weights?

- Notes never leave the device (Forge runs on-device WebGPU).
- No OpenAI/Claude bill for every quiz.
- Students only need the JSON file — the dreaded “write five MCQs by hand” chore becomes a paste → download.

## Stack

- Vite + React + TypeScript + Tailwind CSS
- `@mlc-ai/web-llm` · model `gemma-2-2b-it-q4f16_1-MLC-1k` (Gemma 2 2B IT, ~1.5GB, fits ~4GB VRAM)
- Static host: GitHub Pages (HashRouter)

## Modes

| Mode | Route | AI? |
| --- | --- | --- |
| **Teacher Forge** | `#/forge` | Yes — loads Gemma, emits strict quest JSON |
| **Student Dungeon** | `#/dungeon` | No — upload JSON or play the sample pack |

Quest schema: `questTitle`, `bossName`, five questions with `options[4]`, `correctAnswerIndex`, `explanation`.

## Local setup

```bash
npm install
npm run dev
```

Open the URL Vite prints. Forge needs **WebGPU** (recent Chrome or Edge). First model download is ~1.5GB and caches in the browser.

```bash
npm run build
npm run preview
```

## Deploy

Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys `dist/` to GitHub Pages. Enable **Settings → Pages → Source: GitHub Actions**.

## License

MIT — see [LICENSE](./LICENSE).
