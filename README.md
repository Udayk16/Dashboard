# Analytics Platform

A production-grade full-stack web application consisting of two main modules:

1. **Interactive Analytics Dashboard** - Data-driven dashboard with real-time metrics and charts
2. **"Chat with Data" Interface** - AI-powered natural language analytics using Vanna AI and Groq

## Technology Stack

- **Monorepo**: Turborepo
- **Frontend**: Next.js 14 (App Router) + TypeScript + shadcn/ui + TailwindCSS
- **Backend**: Express.js + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **AI Layer**: Vanna AI (Python FastAPI) + Groq LLM
- **Charts**: Recharts
- **Deployment**: Vercel (Frontend+Backend) + Self-hosted Vanna AI

## Quick Start

### Prerequisites

- Node.js 18+ and npm 10+
- Docker and Docker Compose
- PostgreSQL (or use the provided Docker setup)

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd Dashboard
   npm run setup
   ```

2. **Start the database**
   ```bash
   npm run docker:up
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Generate and seed the database**
   ```bash
   npm run db:generate
   npm run db:seed
   ```

5. **Start the development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Vanna AI Service: http://localhost:8000

## Project Structure

```
Dashboard/
├── apps/
│   ├── web/                 # Next.js Frontend
│   └── api/                 # Express Backend
├── services/
│   └── vanna/               # Python Vanna AI Service
├── packages/
│   └── shared/              # Shared types and utilities
├── data/
│   └── Analytics_Test_Data.json
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Features

### Analytics Dashboard
- Overview cards with key metrics (YTD spend, invoice count, etc.)
- Interactive charts (trends, vendor analysis, category breakdown)
- Searchable, filterable invoices table
- Responsive design

### Chat with Data
- Natural language queries about the data
- AI-generated SQL queries
- Real-time results visualization
- Persistent chat history

## API Endpoints

- `GET /api/stats` - Overview statistics
- `GET /api/invoice-trends` - Monthly invoice trends
- `GET /api/vendors/top10` - Top 10 vendors by spend
- `GET /api/category-spend` - Spend by category
- `GET /api/cash-outflow` - Cash outflow forecast
- `GET /api/invoices` - Paginated invoices with filtering
- `POST /api/chat-with-data` - AI-powered natural language queries

## Development

### Database Management

```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run database migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed
```

### Build and Deployment

```bash
# Build all applications
npm run build

# Run linting
npm run lint

# Run tests
npm run test
```

## Environment Variables

See `.env.example` for required environment variables. Key variables include:

- `DATABASE_URL` - PostgreSQL connection string
- `GROQ_API_KEY` - Groq API key for AI functionality
- `NEXT_PUBLIC_API_BASE` - Backend API base URL
- `VANNA_API_BASE_URL` - Vanna AI service URL

## License

MIT License