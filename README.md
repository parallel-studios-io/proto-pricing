# Proto Pricing

AI-powered pricing intelligence for B2B SaaS. Chat with your business data to get insights on pricing structure, customer distribution, and unit economics.

## Features

- **Chat with your data** - Ask natural language questions about your pricing and customers
- **Multi-agent perspectives** - Get insights from CFO, CRO, CPO, and other executive viewpoints
- **Real-time analytics** - View pricing tiers, customer segments, and revenue concentration
- **Pricing recommendations** - AI-generated pricing optimization suggestions

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **AI**: Anthropic Claude API
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/jkirklandmorris/proto-pricing.git
cd proto-pricing

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key for Claude |

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── api/chat/        # Chat API endpoint
│   ├── chat/            # Chat interface
│   ├── overview/        # Dashboard overview
│   └── analysis/        # Pricing analysis
├── components/          # React components
│   ├── chat/           # Chat UI components
│   ├── cards/          # Card components
│   └── layout/         # Layout components
├── lib/
│   ├── chat/           # Chat context builder
│   ├── generators/     # Synthetic data generators
│   └── pricing/        # Pricing flow engine
└── types/              # TypeScript types
```

## Usage

1. Navigate to the **Chat** page
2. Ask questions like:
   - "What is my current pricing structure?"
   - "What is my distribution of customers?"
   - "What's my revenue concentration risk?"
   - "Tell me about enterprise customers"
3. Mention agents with `@` for specific perspectives (e.g., `@CFO`)

## License

Private - All rights reserved
