# BeHealth 🌿

Personal health & work-life balance dashboard powered by AI (Claude Sonnet).

## Stack

- **Frontend**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS (custom design tokens)
- **State**: Zustand + localStorage (Supabase-ready)
- **Routing**: React Router v6
- **Charts**: Recharts
- **Backend**: Vercel API Routes (Edge Runtime)
- **AI**: Anthropic Claude Sonnet via server-side proxy

## Project structure

```
behealth/
├── api/
│   └── ai.ts              # Vercel Edge Function — Anthropic proxy
├── src/
│   ├── components/
│   │   ├── ui/            # Button, Card, Badge, Spinner, etc.
│   │   └── layout/        # Layout, BottomNav
│   ├── lib/
│   │   ├── api.ts         # Client → /api/ai wrapper
│   │   ├── defaults.ts    # Seed data
│   │   ├── storage.ts     # localStorage abstraction layer
│   │   └── utils.ts       # cn(), dates, score calculations
│   ├── pages/
│   │   ├── Dashboard.tsx  # Health score + lab values + AI analysis
│   │   ├── Balance.tsx    # Work-life sliders + AI insight
│   │   ├── Coach.tsx      # AI chat
│   │   ├── Scanner.tsx    # Camera / upload / text food scanner
│   │   └── OtherPages.tsx # Mood, Trends, Rewards, Wishlist, More, Roadmap
│   ├── store/
│   │   └── useStore.ts    # Zustand store (persisted)
│   ├── types/
│   │   └── index.ts       # All TypeScript types
│   ├── App.tsx            # Router
│   └── main.tsx           # Entry point
├── tailwind.config.js     # Design tokens
└── vercel.json            # Vercel config + rewrites
```

## Local development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local

# 3. Start dev server
npm run dev
```

> The API route reads `process.env.ANTHROPIC_API_KEY` — never hardcode it.

## Deploy to Vercel

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "feat: initial BeHealth scaffold"
git remote add origin https://github.com/YOUR_USERNAME/behealth.git
git push -u origin main

# 2. Import project on vercel.com
# 3. Add environment variable: ANTHROPIC_API_KEY = sk-ant-...
# 4. Deploy
```

## Migrating to Supabase (Phase 2)

The persistence layer is intentionally abstracted in `src/lib/storage.ts`.
When ready:
1. Create Supabase project + tables matching the types in `src/types/index.ts`
2. Replace `storage.get/set` calls in `useStore.ts` with Supabase client calls
3. Add `@supabase/supabase-js` + auth UI
4. Remove `createJSONStorage(() => localStorage)` from Zustand persist config

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ | Your Anthropic API key (server-side only) |
| `VITE_APP_URL` | Optional | Public URL for CORS headers |

## Key design decisions

- **Bottom navigation** (5 items) instead of 9 top tabs → mobile-first UX
- **Zustand with localStorage** → instant persistence, zero backend for MVP
- **Edge Runtime** API route → low latency, deploys globally on Vercel
- **Design tokens** in Tailwind config → easy theming in Rewards store later
- **`partialize`** in Zustand persist → only meaningful data is saved, no ephemeral UI state
