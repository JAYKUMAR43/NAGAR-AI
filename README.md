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
- **Database**: SQLite + Prisma 6 ORM (easily swappable to AlloyDB/PostgreSQL)
- **Deployment**: Next.js standalone configurations (Dockerfile included for Google Cloud Run/Vercel)

---

## Quick Start

### 1. Prerequisites
Ensure you have [Node.js 18+](https://nodejs.org/) installed.

### 2. Install Dependencies
Clone/navigate to the project folder and run:
```bash
npm install
```

### 3. Database Migration & Seeding
Initialize the SQLite database schema and seed the database with **65 realistic mock complaints** spread over 30 days, along with city policy documents. Run:
```bash
# Push schema to SQLite
npx prisma db push

# Run the seeding script
npx prisma db seed
```
*(This creates `prisma/dev.db` and maps vector embeddings inside `db/vector_store.json`)*

### 4. Configuration
Create a `.env.local` file (already preconfigured in the workspace) and add your Google Gemini API Key:
```env
GEMINI_API_KEY=AIzaSy...
```
> **Note on Demo Mode**: If no API key is specified (or the placeholder is kept), Nagar AI automatically runs in **Demo Mode**. It uses fallback heuristics to run classifications and deterministically computes mock vector embeddings so that all features (RAG search, form intake, maps, telemetry, anomaly cards) remain 100% operational out-of-the-box!

### 5. Start Development Server
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
