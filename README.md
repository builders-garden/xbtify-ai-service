# XBTify AI Service 🤖

A powerful AI-driven backend service built with Node.js and TypeScript, featuring Express API, LangChain integration, RAG capabilities with Pinecone, and BullMQ-powered job queues. This service provides AI agent management and Farcaster integration for building intelligent social applications.

## ✨ Features

- **AI Agent Management**: LangChain-powered AI agents with LangGraph orchestration
- **RAG (Retrieval-Augmented Generation)**: Vector embeddings with Pinecone for intelligent context retrieval
- **Farcaster Integration**: Native support for Farcaster protocol and Neynar API
- **Job Queue System**: BullMQ-powered background job processing with Redis
- **Bull Board Dashboard**: Visual monitoring for job queues
- **Database Management**: PostgreSQL with Drizzle ORM
- **Image Processing**: ImageKit integration with Sharp for image optimization
- **Security**: Helmet, CORS, and custom authentication middleware
- **Type Safety**: Full TypeScript implementation with Zod validation

## 🏗️ Architecture

```
├── 🌐 Express API Layer
│   ├── Routes (agent, neynar, user)
│   ├── Controllers
│   └── Middleware (auth, response)
│
├── 🤖 AI & RAG Layer
│   ├── LangChain Agents
│   ├── LangGraph Workflows
│   ├── Pinecone Vector Store
│   └── OpenAI Integration
│
├── 📊 Data Layer
│   ├── PostgreSQL (Drizzle ORM)
│   └── Redis (BullMQ)
│
└── ⚙️ Background Processing
    ├── Agent Initialization Worker
    ├── Agent Reinitialization Worker
    └── Neynar Webhook Worker
```

## 📋 Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: Package manager (recommended)
- **PostgreSQL**: v14 or higher
- **Redis**: v6 or higher
- **API Keys**:
  - OpenAI API key
  - Neynar API key
  - Pinecone API key
  - ImageKit credentials
  - Langfuse credentials (for observability)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/builders-garden/xbtify-ai-service.git
cd xbtify-ai-service
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
BACKEND_URL=http://localhost:3000

# Security
API_SECRET_KEY=your-secret-key-here
SHARED_API_KEY_WITH_NEXT=your-shared-api-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis
REDIS_URL=redis://localhost:6379

# Neynar (Farcaster)
NEYNAR_API_KEY=your-neynar-api-key
NEYNAR_WEBHOOK_ID=your-webhook-id
NEYNAR_WEBHOOK_SECRET=your-webhook-secret

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Pinecone (Vector Database)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=your-index-name

# ImageKit
IMAGEKIT_PUBLIC_KEY=your-imagekit-public-key
IMAGEKIT_PRIVATE_KEY=your-imagekit-private-key
IMAGEKIT_URL_ENDPOINT=your-imagekit-url

# Langfuse (Agent Observability)
LANGFUSE_SECRET_KEY=your-langfuse-secret
LANGFUSE_PUBLIC_KEY=your-langfuse-public
LANGFUSE_BASE_URL=https://cloud.langfuse.com

# Bull Board (Job Queue Dashboard)
ENABLE_BULLBOARD=true
BULLBOARD_PASSWORD=your-dashboard-password
```

### 4. Database Setup

```bash
# Generate database schema
pnpm db:generate

# Run migrations
pnpm db:migrate

# (Optional) Open Drizzle Studio to inspect database
pnpm db:studio
```

### 5. Start Redis

```bash
# macOS (Homebrew)
brew services start redis

# Linux
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis:alpine
```

### 6. Run the Application

**Development Mode (with hot reload):**
```bash
pnpm dev
```

**Production Mode:**
```bash
# Build
pnpm build

# Start
pnpm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## 📚 API Documentation

### Authentication

Most endpoints require authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-api-secret-key" http://localhost:3000/api/endpoint
```

### Main Endpoints

- **Agent Management**: `/api/agent/*`
  - Initialize, manage, and interact with AI agents
  
- **User Management**: `/api/user/*`
  - User profiles and metadata
  
- **Neynar Webhooks**: `/api/neynar/*`
  - Farcaster event processing

### Bull Board Dashboard

Access the job queue dashboard at:
```
http://localhost:3000/bullboard
```

Use basic authentication with username `admin` and the password from `BULLBOARD_PASSWORD`.

## 🛠️ Available Scripts

### Development
```bash
pnpm dev              # Start development server with hot reload
pnpm build            # Compile TypeScript to JavaScript
pnpm build:watch      # Build in watch mode
pnpm start            # Run production build
```

### Database
```bash
pnpm db:generate      # Generate Drizzle schema
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema changes
pnpm db:pull          # Pull schema from database
pnpm db:studio        # Open Drizzle Studio
```

### Code Quality
```bash
pnpm check            # Run Biome checks and auto-fix
pnpm format           # Format code with Biome
pnpm lint             # Lint TypeScript code
pnpm test             # Run Jest tests
```

## 📁 Project Structure

```
src/
├── index.ts                      # Application entry point
├── config/
│   └── env.ts                    # Environment configuration with Zod validation
├── routes/                       # API route definitions
│   ├── agent.route.ts
│   ├── neynar.route.ts
│   └── user.route.ts
├── controllers/                  # Request handlers
│   ├── agent.controller.ts
│   ├── neynar.controller.ts
│   └── user.controller.ts
├── services/                     # Business logic layer
│   ├── agent.service.ts
│   └── user.service.ts
├── middleware/                   # Express middleware
│   ├── auth.middleware.ts
│   └── response.ts
├── lib/
│   ├── agent/                    # AI agent logic
│   │   ├── assistant.ts          # Agent assistant implementation
│   │   ├── init_agent.ts         # Agent initialization
│   │   ├── langgraph.ts          # LangGraph workflow
│   │   ├── prompts.ts            # AI prompts
│   │   └── utils.ts              # Agent utilities
│   ├── rag/                      # RAG implementation
│   │   ├── chunking.ts           # Text chunking strategies
│   │   ├── embeddings.ts         # Vector embeddings
│   │   ├── pinecone.ts           # Pinecone client
│   │   ├── retrieval.ts          # Document retrieval
│   │   └── types.ts
│   ├── database/                 # Database layer
│   │   ├── db.schema.ts          # Drizzle schema
│   │   ├── index.ts
│   │   └── queries/              # Database queries
│   └── utils/                    # Utility functions
├── queues/                       # BullMQ queue definitions
│   ├── agentInitialization.queue.ts
│   ├── agentReinitialization.queue.ts
│   └── neynar.queue.ts
├── workers/                      # Background job processors
│   ├── agentInitialization.worker.ts
│   ├── agentReinitialization.worker.ts
│   └── neynar.worker.ts
├── jobs/                         # Job scheduling and definitions
├── bullboard/                    # Bull Board dashboard config
└── types/                        # TypeScript type definitions
```

## 🔧 Key Technologies

### Core Framework
- **Express.js**: Fast, unopinionated web framework
- **TypeScript**: Type-safe JavaScript
- **Node.js**: JavaScript runtime

### AI & ML
- **LangChain**: AI application framework
- **LangGraph**: Workflow orchestration for AI agents
- **OpenAI**: GPT models for natural language processing
- **Pinecone**: Vector database for embeddings
- **Langfuse**: LLM observability and monitoring

### Database & Caching
- **PostgreSQL**: Primary database
- **Drizzle ORM**: Type-safe SQL toolkit
- **Redis**: In-memory cache and message broker
- **BullMQ**: Redis-based job queue

### Farcaster Integration
- **@neynar/nodejs-sdk**: Neynar API client
- **@farcaster/core**: Farcaster protocol
- **@farcaster/hub-nodejs**: Farcaster Hub client

### Utilities
- **ImageKit**: Image CDN and processing
- **Sharp**: High-performance image processing
- **Zod**: Schema validation
- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing

## 🔗 Related Projects

- **Frontend**: [XBTify MiniApp](https://github.com/builders-garden/xbtify)
- **Farcaster**: [Neynar Documentation](https://docs.neynar.com)
- **LangChain**: [LangChain Documentation](https://js.langchain.com)

## Environment Variables

Key environment variables that need to be configured:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `API_SECRET_KEY`: Secret key for API authentication (min 32 characters)
- `DATABASE_URL`: PostgreSQL connection string
- `DIRECT_URL`: Direct PostgreSQL connection string
- `REDIS_HOST`: Redis host (default: localhost)
- `REDIS_PORT`: Redis port (default: 6379)
- `NEYNAR_API_KEY`: Your Neynar API key
- `NEXT_PUBLIC_URL`: Your application's public URL

## API Authentication

All API endpoints (except `/health`) require authentication using an API secret key. To make authenticated requests:

1. Set the `API_SECRET_KEY` in your environment variables
2. Include the secret key in your requests using the `x-api-secret` header:

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "x-api-secret: your-secret-key-here" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "text": "Message"}'
```

---

Built with ❤️ for ETHRome 2025 🇮🇹