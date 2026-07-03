# Nagar AI - Decision Intelligence Platform for Smart Communities

Nagar AI is a full-stack, production-ready civic decision intelligence platform designed to connect citizens and municipal administrators using AI-driven ingestion, automated routing, RAG search, and statistical telemetry.

## Core Features
1. **Interactive 3D Landing Page**: Procedurally generated 3D low-poly city built with React Three Fiber, OrbitControls, and animated data telemetry flows.
2. **Citizen Portal (`/report`)**: A mobile-first, gesture-driven multi-step report intake form with swipe support. Integrates Google Gemini multimodal API to auto-classify categories, rate urgencies, generate summaries, and assign handling departments on the fly.
3. **Official Dashboard (`/dashboard`)**:
   - **Interactive SVG Ward Map**: Telemetry mapping showing incident density across 5 wards. Clicking isolates ward tickets.
   - **Ask Nagar AI (RAG Search)**: Natural language querying over complaints and municipal policies using vector embeddings (`text-embedding-004`) and synthesis (`gemini-2.0-flash`).
   - **Statistical Anomaly Detector**: Identifies daily volume spikes per ward per category (exceeding Mean + 2 * StdDev) and highlights them with animated alert cards.
   - **Auto-routing simulator**: Interactive SVG path flow animation charting a ticket's routing path.
4. **Analytics Console (`/insights`)**: Animated charts (Recharts) displaying category, urgency, and ward breakdown. Includes a 7-day Simple Moving Average (SMA) volume forecast.
5. **AI Chat Widget**: Floating, draggable chat assistant (Framer Motion drag gestures) offering municipal policy guidance and incident audits.

---

## Tech Stack
- **Frontend**: Next.js 14/16 (App Router) + TypeScript + Tailwind CSS
- **3D / Animations**: React Three Fiber + Drei (Three.js), Framer Motion, use-gesture
- **AI / RAG**: `@google/generative-ai` (Gemini 2.0 Flash & Text Embedding 004), custom local cosine-similarity JSON Vector Store
- **Database**: PostgreSQL + Prisma 6 ORM
- **Deployment**: Next.js standalone configurations (Dockerfile included for Google Cloud Run/Vercel)

---

## Quick Start

### 1. Prerequisites
- Ensure you have [Node.js 18+](https://nodejs.org/) installed.
- Access to a hosted PostgreSQL instance (e.g. [Vercel Postgres](https://vercel.com/storage/postgres), [Neon](https://neon.tech), or [Supabase](https://supabase.com)).

### 2. Install Dependencies
Clone/navigate to the project folder and run:
```bash
npm install
```

### 3. Database Migration & Seeding
Initialize the PostgreSQL database schema and seed it with **65 realistic mock complaints** spread over 30 days, along with city policy documents.

1. Create a `.env` or `.env.local` file in the root folder.
2. Set your environment variables:
   ```env
   # Database connection string pointing to your PostgreSQL instance
   DATABASE_URL="postgresql://[user]:[password]@[host]/[dbname]?sslmode=require"
   
   # Optional: Google Gemini API Key
   GEMINI_API_KEY="AIzaSy..."
   ```
3. Push the database schema and run the seed script:
   ```bash
   # Push schema to PostgreSQL
   npx prisma db push
   
   # Run the seeding script
   npx prisma db seed
   ```
   *(This maps the DB schemas and populates vector embeddings inside `db/vector_store.json`)*

### 4. Deploying to Vercel

To deploy this application to Vercel, ensure you configure the following **Environment Variables** in your Vercel Project Dashboard under **Project Settings → Environment Variables**:

1. **`DATABASE_URL`**: Set the value to your hosted PostgreSQL database connection string.
2. **`GEMINI_API_KEY`**: Set your Google Gemini API Key to enable live AI Decision Intelligence (classification, RAG, and report summaries). If omitted, the application falls back to Demo Mode.

> [!IMPORTANT]
> - Do not write these environment variables in `.env.local` for production, as `.env.local` is git-ignored and never reaches the deployed environment.
> - After adding or modifying environment variables in the Vercel dashboard, you **must trigger a redeploy** for the variables to take effect.
> - The Vercel build script is configured to automatically run `prisma generate && prisma db push` to keep your database schemas synchronized on every deployment.

### 5. Local Development
Run:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to experience Nagar AI.

---

## Docker Deployment (Google Cloud Run)
Nagar AI is configured to use Next.js standalone builds. To run it in a container:

1. Build the Docker image:
   ```bash
   docker build -t gcr.io/your-project-id/nagar-ai:latest .
   ```
2. Run the container locally:
   ```bash
   docker run -p 8080:8080 -e GEMINI_API_KEY="your-key" gcr.io/your-project-id/nagar-ai:latest
   ```
3. Deploy to Google Cloud Run:
   ```bash
   gcloud run deploy nagar-ai --image gcr.io/your-project-id/nagar-ai:latest --platform managed --allow-unauthenticated
   ```
