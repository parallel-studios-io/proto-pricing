# Proto Pricing — Conceptual Architecture

## What Is Proto Pricing?

Proto Pricing is an AI-powered pricing intelligence platform for B2B SaaS companies. It is a **living demo** — users describe any B2B SaaS company in natural language (or choose a preset), and the system generates a complete company profile, synthetic billing and CRM data, a structured business ontology, and competitive intelligence automatically. A council of AI agents — each representing a different executive perspective — then analyzes, debates, and recommends pricing changes against that generated dataset.

The core idea: **pricing decisions are too important to make from a single viewpoint**. Proto Pricing forces a structured, multi-perspective evaluation of every pricing option — and the living demo makes it possible to explore this for any company, not just one hardcoded example.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                                  │
│                                                                          │
│   ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌────────┐ │
│   │  Company  │  │   Chat   │  │ Overview  │  │ Analysis │  │Ontology│ │
│   │  Setup   │  │Interface │  │ Dashboard │  │   Flow   │  │ Editor │ │
│   └────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └───┬────┘ │
│        │              │              │              │             │      │
└────────┼──────────────┼──────────────┼──────────────┼─────────────┼──────┘
         │              │              │              │             │
┌────────┴──────────────┴──────────────┴──────────────┴─────────────┴──────┐
│                           API LAYER                                      │
│                       (Next.js API Routes)                               │
│                                                                          │
│   /api/company/setup   /api/company/generate                             │
│   /api/chat  /api/analytics  /api/pricing  /api/ontology                 │
└────────┬──────────────┬──────────────┬──────────────┬───────────────┬────┘
         │              │              │              │               │
┌────────┴──────────────┴──────────────┴──────────────┴───────────────┴────┐
│                         SERVICE LAYER                                    │
│                                                                          │
│   ┌────────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│   │ Company Setup  │  │  Chat Context   │  │ Ontology Enrichment    │   │
│   │   Service      │  │    Builder      │  │   Service (Claude)     │   │
│   └────────────────┘  └─────────────────┘  └────────────────────────┘   │
│   ┌────────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│   │  Pricing Flow  │  │ Debate Generator│  │     Ontology           │   │
│   │    Engine      │  │ (Multi-Agent)   │  │     Service            │   │
│   └────────────────┘  └─────────────────┘  └────────────────────────┘   │
│   ┌────────────────┐  ┌─────────────────┐  ┌────────────────────────┐   │
│   │   Analytics    │  │   Decision      │  │  Parameterized         │   │
│   │    Engine      │  │   Service       │  │  Generators            │   │
│   └────────────────┘  └─────────────────┘  └────────────────────────┘   │
└────────┬──────────────┬──────────────┬───────────────┬──────────────────┘
         │              │              │               │
┌────────┴──────────────┴──────┐  ┌───┴───────────────┴──────────┐
│       SUPABASE DATABASE      │  │       EXTERNAL APIS          │
│                              │  │                              │
│  Stripe data · HubSpot data │  │  Anthropic Claude (AI)       │
│  Unified customers           │  │   - Profile generation       │
│  Ontology (segments, tiers)  │  │   - Web search (competitors) │
│  Competitors · Market ctx    │  │   - Ontology enrichment      │
│  Company profiles (JSONB)    │  │   - Chat & analysis          │
│  Analytics · Decisions       │  │  Stripe (billing)            │
│  Audit log · Snapshots       │  │  HubSpot (CRM)              │
└──────────────────────────────┘  └──────────────────────────────┘
```

---

## The Living Demo: Company Setup Flow

The entry point to Proto Pricing is the **Company Setup** page (`/setup`). Instead of being locked to a single hardcoded company, users can generate a full demo for any B2B SaaS business.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         /setup                                        │
│                                                                       │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│   │   MyParcel        │  │   StreamAPI       │  │   Custom         │  │
│   │   Preset Card     │  │   Preset Card     │  │   Description    │  │
│   │                   │  │                   │  │   Form           │  │
│   │  EUR · Shipping   │  │  USD · Dev Tools  │  │  "Describe your  │  │
│   │  Netherlands      │  │  United States    │  │   B2B SaaS..."   │  │
│   │  27K cust · €110M │  │  8.5K cust · $12M │  │                  │  │
│   └────────┬──────────┘  └────────┬──────────┘  └────────┬─────────┘  │
│            │                      │                      │            │
└────────────┼──────────────────────┼──────────────────────┼────────────┘
             │                      │                      │
             ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   POST /api/company/setup                             │
│                                                                       │
│   Preset path:                Custom path:                            │
│   Load preset profile ──┐    Claude generates CompanyProfile ──┐     │
│                          │    Claude researches market via      │     │
│                          │      web_search tool               │     │
│                          ▼                                     ▼     │
│                    ┌─────────────────────────────┐                    │
│                    │  Store CompanyProfile JSONB  │                    │
│                    │  on organizations table      │                    │
│                    │  Set setup_status=generating │                    │
│                    └──────────────┬───────────────┘                    │
│                                  │                                     │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  /setup/generating (progress UI)                      │
│                                                                       │
│                   POST /api/company/generate                          │
│                                                                       │
│   1. Read CompanyProfile from organizations table                     │
│   2. Clear existing org data                                          │
│   3. Parameterized generators create synthetic data:                  │
│      ├── generateStripeDataFromProfile()    → Stripe tables           │
│      ├── generateHubSpotDataFromProfile()   → HubSpot tables          │
│      ├── generateOntologyDataFromProfile()  → Segments, tiers, etc.   │
│      └── Insert competitors from profile    → Competitors table       │
│   4. Create unified customers                                         │
│   5. enrichOntologyWithClaude()             → Refine descriptions     │
│   6. Set setup_status=ready                                           │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

### Two Built-In Presets

| Preset | Currency | Vertical | Country | Customers | ARR | Competitors |
|--------|----------|----------|---------|-----------|-----|-------------|
| **MyParcel** | EUR | Shipping & logistics | Netherlands | 27,000 | ~110M | Sendcloud, Shippo |
| **StreamAPI** | USD | Developer tools / API | United States | 8,500 | ~12M | Twilio, SendGrid |

Presets skip the Claude generation step and load a pre-built `CompanyProfile` directly. Custom descriptions go through both Claude profile generation and Claude web research.

---

## The Four Layers

### 1. Presentation Layer

The UI is a Next.js app with five primary views:

| View | Purpose |
|------|---------|
| **Company Setup** | Choose a preset or describe a company in natural language. Generates a full demo. |
| **Chat** | Natural language interface to query business data. Mention `@CFO`, `@CRO`, etc. to get a specific executive's perspective. |
| **Overview Dashboard** | Visual analytics — MRR trends, segment health, churn signals, retention curves. |
| **Analysis Flow** | The structured 7-step pricing decision pipeline (see below). |
| **Ontology Editor** | View and edit the structured business model — segments, tiers, value metrics, patterns. |

There is also a **Demo Walkthrough** mode that guides new users through connecting data, running analysis, and chatting with insights.

### 2. API Layer

RESTful endpoints built with Next.js App Router:

- **`/api/company/setup`** — Accepts a preset name or natural language description; generates a CompanyProfile via Claude, enriches with web research, stores on the organization
- **`/api/company/generate`** — Seeds Stripe/HubSpot synthetic data from the stored CompanyProfile, builds the ontology, runs Claude enrichment
- **`/api/chat`** — Streams Claude responses with business context injected into system prompts (reads company name + currency from the org profile dynamically)
- **`/api/analytics/*`** — Health scores, unit economics, segments, patterns
- **`/api/pricing/analyze`** — Runs the full 7-step pricing flow
- **`/api/ontology/*`** — CRUD operations on the business model
- **`/api/decisions`** — Records pricing decisions and tracks outcomes

### 3. Service Layer

Core business logic, independent of HTTP concerns:

- **Company Setup Service** (`src/lib/services/company-setup-service.ts`) — Two-stage Claude pipeline: (1) generate a structured `CompanyProfile` from a natural language description, (2) enrich with market research using Claude's `web_search` tool to discover competitors, market size, trends, and strategic positioning
- **Ontology Enrichment Service** (`src/lib/services/ontology-enrichment-service.ts`) — Post-seeding Claude enrichment that reads the algorithmically-derived ontology from the DB and adds business-specific insights: richer segment descriptions, actionable recommended actions for patterns, and value driver refinements informed by competitors and market context
- **Parameterized Generators** (`src/lib/generators/synthetic/`) — Stripe, HubSpot, and ontology data generators that accept a `CompanyProfile` instead of hardcoded config. Functions like `generateStripeDataFromProfile()`, `generateHubSpotDataFromProfile()`, and `generateOntologyDataFromProfile()` produce company-specific synthetic datasets
- **Context Builder** — Dynamically assembles Claude system prompts from the current ontology (segments, economics, patterns, competitors, market context, strategic positioning), parameterized with the company name and currency from the org profile
- **Flow Engine** — Orchestrates the 7-step pricing analysis pipeline with DB-backed reads and dynamic segment lookups (by revenue_share, expansion_rate) rather than hardcoded segment names
- **Debate Generator** — Runs multi-agent evaluation where each executive agent scores and critiques pricing options
- **Analytics Engine** — Calculates LTV, retention cohorts, RFM segmentation, value metric correlations, and pattern detection. The real data adapter reads value metrics and tier churn from the DB dynamically
- **Ontology Service** — Manages the structured business model with audit logging and snapshots
- **Decision Service** — Tracks which pricing decisions were made and their real-world outcomes

### 4. Data Layer

**Supabase (PostgreSQL)** stores everything with a multi-tenant organization model:

```
┌──────────────────────────────────────────────────────────────────┐
│                      DATA ARCHITECTURE                            │
│                                                                   │
│  ┌───────────────────┐                                           │
│  │  Organizations     │                                           │
│  │                    │                                           │
│  │  company_profile   │  (JSONB — full CompanyProfile)            │
│  │  setup_status      │  (pending | generating | ready | error)   │
│  │  setup_error       │                                           │
│  └────────┬───────────┘                                           │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐   ┌─────────────────┐                       │
│  │  Source Data     │   │  Unified Layer  │                       │
│  │                  │   │                 │                       │
│  │  stripe_*        │──▶│ unified_        │                       │
│  │  hubspot_*       │──▶│ customers       │                       │
│  │                  │   │ transactions    │                       │
│  └─────────────────┘   │ products        │                       │
│                         └────────┬────────┘                       │
│                                  │                                │
│                                  ▼                                │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              Ontology (Business Model)                  │      │
│  │                                                         │      │
│  │  segments · pricing_tiers · value_metrics · patterns    │      │
│  │  economics_snapshots (+ market_context JSONB,           │      │
│  │    strategic_positioning JSONB, competitor_summary JSONB)│      │
│  │  ontology_snapshots (versioned state)                   │      │
│  └──────────────────┬─────────────────────────────────────┘      │
│                     │                                             │
│                     ▼                                             │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              Competitors                                │      │
│  │                                                         │      │
│  │  name · positioning · pricing_model · price_range       │      │
│  │  key_differentiators[] · estimated_market_share         │      │
│  │  source (claude_research | company_profile)             │      │
│  │  (RLS-enabled, per-organization)                        │      │
│  └────────────────────────────────────────────────────────┘      │
│                     │                                             │
│                     ▼                                             │
│  ┌────────────────────────────────────────────────────────┐      │
│  │              Analytics & Decisions                      │      │
│  │                                                         │      │
│  │  health_scores · rfm_scores · retention                 │      │
│  │  pricing_options · council_evaluations                   │      │
│  │  decision_records · audit_log                            │      │
│  └────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
```

Data flows **upward**: the CompanyProfile drives synthetic data generation, raw source data is unified, the ontology is derived algorithmically from unified data, Claude enriches the ontology, and analytics/decisions build on the enriched ontology.

---

## The Multi-Agent Council

The defining feature of Proto Pricing. Eight AI agents, each with a distinct executive persona, evaluate every pricing option:

```
                    ┌─────────────┐
                    │   Pricing   │
                    │   Option    │
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
     ┌─────┴─────┐  ┌─────┴─────┐  ┌─────┴─────┐
     │    CFO    │  │    CRO    │  │    CPO    │
     │ Economics │  │ Revenue   │  │ Product   │
     │ & Margins │  │ & Growth  │  │ & Value   │
     └───────────┘  └───────────┘  └───────────┘
     ┌───────────┐  ┌───────────┐  ┌───────────┐
     │    CMO    │  │    CSO    │  │    CTO    │
     │ Market &  │  │ Strategy  │  │ Technical │
     │ Position  │  │ & Compete │  │ Feasiblty │
     └───────────┘  └───────────┘  └───────────┘
     ┌───────────┐  ┌───────────┐
     │    COO    │  │    CDO    │
     │ Execution │  │ Customer  │
     │ & Ops     │  │ & Trust   │
     └───────────┘  └───────────┘
                           │
                    ┌──────┴──────┐
                    │  Consensus  │
                    │   Score &   │
                    │  Decision   │
                    └─────────────┘
```

Each agent evaluates options through their lens — the CFO cares about margins and cash flow, the CRO about acquisition and retention, the CDO about customer trust. The system synthesizes these into a consensus score and highlights areas of agreement and tension.

---

## The 7-Step Pricing Flow

This is the core analytical pipeline:

```
Step 1          Step 2           Step 3            Step 4
┌──────────┐   ┌────────────┐   ┌──────────────┐  ┌──────────────┐
│ Ingest & │──▶│  Segment   │──▶│   Pricing    │──▶│    Unit      │
│Normalize │   │ Detection  │   │  Structure   │  │  Economics   │
│          │   │            │   │   Mapping    │  │              │
│ Pull from│   │ Cluster by │   │ Map current  │  │ ARPU, LTV,   │
│ Stripe & │   │ behavior & │   │ model to     │  │ churn, CAC   │
│ HubSpot  │   │ value      │   │ segments     │  │ per segment  │
└──────────┘   └────────────┘   └──────────────┘  └──────┬───────┘
                                                          │
                                                          ▼
Step 7          Step 6           Step 5
┌──────────┐   ┌────────────┐   ┌──────────────┐
│ Decision │◀──│  Council   │◀──│   Option     │
│  Record  │   │ Evaluation │   │ Generation   │
│          │   │            │   │              │
│ Track &  │   │ 8 agents   │   │ Generate 4   │
│ learn    │   │ score each │   │ pricing      │
│ outcomes │   │ option     │   │ scenarios    │
└──────────┘   └────────────┘   └──────────────┘
```

1. **Ingest & Normalize** — Pull raw data from Stripe (billing) and HubSpot (CRM) into a unified customer model
2. **Segment Detection** — Cluster customers by behavior, revenue, and engagement patterns
3. **Pricing Structure Mapping** — Map the current pricing model onto discovered segments
4. **Unit Economics** — Calculate ARPU, LTV, churn rate, and expansion revenue per segment
5. **Option Generation** — Generate 4 distinct pricing scenarios with projected impact models
6. **Council Evaluation** — Each of the 8 executive agents evaluates every option
7. **Decision Record** — Record the chosen option and track real-world outcomes over time

---

## The Ontology (Business Model)

The ontology is a structured, versioned representation of the business. It is what the AI reasons over and what analysts edit. It now includes competitive and market intelligence alongside the core segment/tier model.

```
┌─────────────────────────────────────────────────────────────────┐
│                          ONTOLOGY                                │
│                                                                  │
│  ┌───────────┐     ┌──────────────┐     ┌──────────────────┐   │
│  │ Segments  │     │ Pricing Tiers│     │   Competitors    │   │
│  │           │     │              │     │                  │   │
│  │ (derived  │     │ (derived     │     │  name            │   │
│  │  from     │     │  from        │     │  positioning     │   │
│  │  profile) │     │  profile)    │     │  pricing_model   │   │
│  └─────┬─────┘     └──────┬───────┘     │  price_range     │   │
│        │                  │             │  differentiators  │   │
│        │                  │             │  market_share     │   │
│        ▼                  ▼             └────────┬─────────┘   │
│  ┌──────────────────────────────┐               │              │
│  │       Value Metrics          │               │              │
│  │  (what customers value)      │               │              │
│  │                              │               │              │
│  │  Primary: from profile       │               │              │
│  │    (e.g. shipping labels,    │               │              │
│  │     API calls, seats)        │               │              │
│  │  Secondary: from profile     │               │              │
│  └──────────────┬───────────────┘               │              │
│                 │                                │              │
│                 ▼                                ▼              │
│  ┌──────────────────────────────┐  ┌──────────────────────┐   │
│  │        Patterns              │  │  Market Context      │   │
│  │  (detected behaviors)        │  │                      │   │
│  │                              │  │  market_category     │   │
│  │  Churn signals               │  │  TAM · growth_rate   │   │
│  │  Upgrade triggers            │  │  market_structure    │   │
│  │  Seasonal trends             │  │  key_trends[]        │   │
│  │  Expansion opportunities     │  │  buying_factors[]    │   │
│  └──────────────────────────────┘  └──────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Strategic Positioning                        │   │
│  │                                                           │   │
│  │  value_proposition · target_segments[]                    │   │
│  │  key_advantages[] · key_risks[]                           │   │
│  │  pricing_philosophy (Value-based | Penetration | ...)     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Every change is audit-logged. Snapshots capture                 │
│  the full ontology state at a point in time.                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## AI Integration

Claude (Anthropic) is used in four modes:

### Company Setup Mode
The **Company Setup Service** uses Claude in two stages:
1. **Profile Generation** — Given a natural language company description, Claude generates a structured `CompanyProfile` JSON with segments, tiers, products, and value metrics that respect realistic distributions (Pareto revenue patterns, churn rates, expansion rates)
2. **Market Research** — Claude uses its `web_search` tool (up to 5 searches) to research the competitive landscape, market size, trends, and buying factors, returning structured `MarketContext`, `CompetitorProfile[]`, and `StrategicPositioning` data

### Ontology Enrichment Mode
The **Ontology Enrichment Service** runs after synthetic data is seeded. It reads the algorithmically-derived ontology from the database and asks Claude to refine it with business-specific insights: richer segment descriptions, actionable recommended actions for each pattern, and value driver refinements informed by competitor data and market context.

### Chat Mode
The **Context Builder** assembles a system prompt from the live ontology — segments, economics, patterns, tiers, competitors, market context, and strategic positioning — parameterized with the company name and currency from the organization profile. Users can `@mention` specific agents to get a targeted perspective.

### Analysis Mode
The **Flow Engine** and **Debate Generator** use Claude to:
- Generate pricing option scenarios based on real data
- Have each executive agent evaluate options with structured scoring
- Synthesize consensus and highlight disagreements

---

## Database Schema Additions

The living demo system added the following schema changes (migration `00010`):

| Table | Column / Change | Type | Purpose |
|-------|----------------|------|---------|
| `organizations` | `company_profile` | JSONB | Full CompanyProfile (segments, tiers, products, market context, competitors, strategic positioning) |
| `organizations` | `setup_status` | TEXT (CHECK) | Tracks setup progress: `pending`, `generating`, `ready`, `error` |
| `organizations` | `setup_error` | TEXT | Error message if setup fails |
| `competitors` (new table) | `name`, `positioning`, `pricing_model`, `price_range`, `key_differentiators[]`, `estimated_market_share`, `source` | Various | Per-organization competitor intelligence, RLS-enabled |
| `economics_snapshots` | `market_context` | JSONB | Market category, TAM, growth rate, trends, buying factors |
| `economics_snapshots` | `strategic_positioning` | JSONB | Value proposition, advantages, risks, pricing philosophy |
| `economics_snapshots` | `competitor_summary` | JSONB | Snapshot of competitor landscape at time of economics calculation |

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS, Radix UI, Recharts |
| API | Next.js App Router (REST) |
| AI | Anthropic Claude (Sonnet 4) — profile generation, web search, ontology enrichment, chat, analysis |
| Database | Supabase (PostgreSQL) |
| ORM | Prisma 7 |
| Integrations | Stripe SDK, HubSpot API |
| Validation | Zod |
| Data Fetching | SWR |

---

## Data Flow Summary

```
                    ┌───────────────────────────────┐
                    │    Natural Language Input      │
                    │    OR Preset Selection         │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Claude generates              │
                    │  CompanyProfile                │
                    │  (segments, tiers, products)   │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │  Claude web_search researches  │
                    │  competitors, market, strategy │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
              ┌─────────────────────┴─────────────────────┐
              │          Parameterized Generators          │
              │                                           │
              │   Stripe ──┐          ┌── HubSpot         │
              │            ├── Seed ──┤                    │
              │   Ontology ┘          └── Competitors      │
              └─────────────────────┬─────────────────────┘
                                    │
                                    ▼
              ┌──────────┐   ┌──────────┐   ┌─────────────┐
              │ Unified  │──▶│ Ontology │──▶│  Analytics  │
              │ Customer │   │(Business │   │  Engine     │
              │  Model   │   │ Model)   │   │             │
              └──────────┘   └────┬────┘   │ Health      │
                                  │         │ Retention   │
                                  │         │ Patterns    │
                                  │         │ Economics   │
                                  │         └─────────────┘
                                  ▼
                    ┌───────────────────────────────┐
                    │  Claude enriches ontology      │
                    │  (segments, patterns)          │
                    └───────────────┬───────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐       ┌──────────────┐        ┌──────────────────┐
   │    Chat     │       │  Dashboard   │        │  Analysis Flow   │
   │  Interface  │       │  & Ontology  │        │  & Decisions     │
   └─────────────┘       └──────────────┘        └──────────────────┘
```

1. **User input** — A natural language company description or preset selection kicks off the process
2. **Claude generates** a structured `CompanyProfile` with segments, tiers, products, and value metrics
3. **Claude researches** competitors, market size, trends, and strategic positioning via web search
4. **Parameterized generators** create synthetic Stripe billing data, HubSpot CRM data, ontology structures, and competitor records — all driven by the CompanyProfile
5. **Data is unified** into a common customer/transaction model
6. **The ontology is derived** algorithmically — segments, tiers, metrics, patterns
7. **Claude enriches** the ontology with business-specific insights (richer descriptions, actionable recommendations)
8. **The analytics engine** computes health scores, retention curves, and pattern detection
9. All of this feeds into the **chat context**, **dashboard**, **analysis flow**, and **decision records**

---

## Key Design Principles

- **Living demo** — Any B2B SaaS company can be modeled from a natural language description; the system is not locked to a single hardcoded example
- **Profile-driven generation** — A single `CompanyProfile` object drives all synthetic data generation, ontology derivation, and context building. Change the profile, change the entire demo
- **Multi-perspective by default** — No pricing decision is evaluated from a single viewpoint
- **Data-grounded AI** — Claude always reasons over real business data, never in a vacuum. The context builder dynamically assembles prompts from the live ontology, parameterized with company name and currency
- **Competitive intelligence** — Competitors, market context, and strategic positioning are first-class objects in the ontology, surfaced to all AI agents
- **Auditable** — Every ontology change is logged, every decision is recorded with outcomes
- **Versioned** — Ontology snapshots let you see how the business model evolved
- **Source-agnostic** — The unified layer abstracts away whether data came from Stripe, HubSpot, or elsewhere
- **Parameterized, not hardcoded** — All generators, context builders, and flow engine lookups use the CompanyProfile and dynamic DB queries instead of hardcoded company names, currencies, or segment names
