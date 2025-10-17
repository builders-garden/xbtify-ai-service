# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/farville?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/farville?schema=public"

# Redis Configuration (for BullMQ)
REDIS_URL="your_redis_url_here"

# Neynar API Configuration
NEYNAR_API_KEY=your_neynar_api_key_here

# Application URL (for notifications)
APP_URL=http://localhost:3000

API_SECRET_KEY=your_api_secret_key_here

MIDJOURNEY_API_KEY=your_midjourney_api_key_here