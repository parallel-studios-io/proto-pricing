# Proto Pricing

AI-powered pricing intelligence platform for B2B SaaS. Proto Pricing is a "living demo" where you can describe any company and the system generates a complete business simulation with AI-powered pricing analysis.

## Features

- **Living Demo** - Describe any B2B SaaS company or use a preset (MyParcel, StreamAPI)
- **AI Company Profiles** - Claude generates company profiles with market research via web search
- **Synthetic Data Generation** - Parameterized synthetic data generation (Stripe/HubSpot/ontology)
- **Hybrid Ontology** - Hybrid ontology derivation (algorithmic + Claude enrichment)
- **Multi-Agent Council** - CFO, CRO, CPO, CSO, CTO, COO, CMO, CDO executive perspectives
- **Chat with Your Data** - Use @agent mentions for targeted executive insights
- **7-Step Pricing Analysis** - Structured pricing analysis flow
- **Market Context** - Competitors and market context included in analysis

## Tech Stack

- **Framework**: Next.js 16, React 19
- **AI**: Anthropic Claude (Sonnet 4) with web search
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS 4
- **Components**: Radix UI, Recharts, Lucide icons
- **Validation**: Zod

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (required) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (required) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (required) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (required, for admin operations) |

## Getting Started (Local Development)

```bash
git clone https://github.com/jkirklandmorris/proto-pricing.git
cd proto-pricing
npm install
cp .env.example .env.local
# Fill in environment variables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Database Setup (Supabase)

1. Create a Supabase project at [https://supabase.com](https://supabase.com)
2. Go to **SQL Editor** in the Supabase dashboard
3. Run the migration file: `supabase/all_migrations.sql`
4. Copy your Supabase URL, anon key, and service role key to `.env.local`

## Project Structure

```
src/
├── app/                     # Next.js App Router pages
│   ├── api/
│   │   ├── chat/           # Chat API
│   │   ├── company/        # Company setup & generate APIs
│   │   ├── pricing/        # Pricing analysis API
│   │   ├── ontology/       # Ontology CRUD APIs
│   │   └── analytics/      # Analytics APIs
│   ├── setup/              # Company setup UI
│   ├── chat/               # Chat interface
│   ├── overview/           # Dashboard
│   └── analysis/           # Pricing analysis flow
├── components/
│   ├── setup/              # Company setup components
│   ├── chat/               # Chat UI
│   ├── cards/              # Card components
│   └── layout/             # Sidebar, Header
├── lib/
│   ├── services/           # Company setup, ontology enrichment
│   ├── generators/         # Synthetic data generators + presets
│   ├── pricing/            # Flow engine, real data adapter
│   ├── chat/               # Context builder
│   ├── analytics/          # Analytics engine
│   └── db/                 # Database layer (ontology CRUD)
└── types/                  # TypeScript types (company-profile, database, etc.)
```

## Usage

1. Navigate to `/setup` (or `/` which redirects there)
2. Choose a preset (MyParcel or StreamAPI) or describe your own company
3. Wait for data generation
4. Explore the **Overview** dashboard, **Chat**, and **Analysis** flow
5. Use `@CFO`, `@CRO`, `@CPO` etc. for executive perspectives

## Deployment

### Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and paste and run `supabase/all_migrations.sql`
3. Copy your URL, anon key, and service role key

### GitHub

```bash
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/proto-pricing.git
git push -u origin main
```

### Vercel

1. Go to [vercel.com](https://vercel.com) and select **Import Project**, then choose your GitHub repo
2. Add environment variables (`ANTHROPIC_API_KEY`, Supabase keys)
3. Deploy

## License

Private - All rights reserved
