# Farville Service

A Node.js TypeScript service implementing Express API and scheduled jobs using BullMQ.

## Prerequisites

- Node.js (v16 or higher)
- Redis (for BullMQ)
- PostgreSQL (for database)
- npm or yarn

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd farville-service
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

   - Copy `.env.tpl` to `.env`
   - Update the following variables in `.env`:
     - `DATABASE_URL`: Your PostgreSQL connection string
     - `DIRECT_URL`: Direct PostgreSQL connection string (same as DATABASE_URL)
     - `NEYNAR_API_KEY`: Your Neynar API key
     - `NEXT_PUBLIC_URL`: Your application's public URL
     - Other variables can be left as default for local development

4. Set up the database:

```bash
# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate
```

5. Start Redis server (required for BullMQ):

```bash
# On macOS with Homebrew
brew services start redis

# On Linux
sudo service redis-server start
```

## Development

Run the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` by default.

## Production

Build and start the production server:

```bash
# Build TypeScript code
npm run build

# Start the server
npm start
```

## Available Scripts

- `npm run dev`: Start development server with hot reload
- `npm run build`: Build the TypeScript code
- `npm start`: Start the production server
- `npm run lint`: Run ESLint
- `npm test`: Run tests
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations

## Project Structure

```
src/
  ├── index.ts          # Application entry point
  ├── routes/           # API routes
  ├── controllers/      # Route controllers
  ├── services/         # Business logic
  ├── jobs/            # BullMQ job definitions
  └── types/           # TypeScript type definitions
```

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

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

[Add your license information here]
