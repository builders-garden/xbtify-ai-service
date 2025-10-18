# Server Configuration
PORT=3000
NODE_ENV=development

# url of this backend to update the webhook
BACKEND_URL="https://tunnel.example.com"

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/db?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/db?schema=public"

# Redis Configuration (for BullMQ)
REDIS_URL="your_redis_url_here"

# Neynar API Configuration
NEYNAR_API_KEY="your_neynar_api_key_here"
NEYNAR_WEBHOOK_ID="123"
NEYNAR_WEBHOOK_SECRET="456"

# Application URL (for notifications)
APP_URL=http://localhost:3000

API_SECRET_KEY=your_api_secret_key_here

MIDJOURNEY_API_KEY=your_midjourney_api_key_here

# Langfuse Agent tracking
LANGFUSE_SECRET_KEY="sk-lf-"
LANGFUSE_PUBLIC_KEY="pk-lf-"
LANGFUSE_BASE_URL=https://cloud.langfuse.com