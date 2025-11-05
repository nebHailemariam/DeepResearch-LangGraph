# Deep Research Chat

A multi-agent research system that generates comprehensive reports on complex topics. Built with LangGraph, Next.js, and OpenAI.

Ask a research question and the system deploys multiple analyst agents with different expertise areas. They work in parallel to gather information, synthesize findings, and produce a full research report with introduction, body, and conclusion sections.

The system uses a fan-in/fan-out architecture with parallel processing - multiple agents execute simultaneously rather than sequentially, making it much faster than traditional single-agent approaches.

The UI shows progress indicators while it's working, so you know what's happening at each step.

## Setup

You'll need Python 3.11+ and Node.js 18+.

### Backend

1. Create a virtual environment:

```bash
cd server
python -m venv venv
source venv/bin/activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Set up your `.env` file in the `server` directory:

```
OPENAI_API_KEY=your_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

The app uses PostgreSQL for storing conversation state. Set up a database and add the connection string to your `.env` file.

4. Start the LangGraph server:

```bash
langgraph dev
```

This runs on `http://localhost:8123` by default.

### Frontend

1. Install dependencies:

```bash
cd client
npm install
```

2. Start the dev server:

```bash
npm run dev
```

The app will be at `http://localhost:3000`.

## How it works

The system uses a fan-in/fan-out pattern with multiple agents working in parallel. This multi-agent architecture enables concurrent processing and comprehensive coverage - agents don't wait for each other, they all run at the same time.

**Fan-out phase:**

- Creates 2 analyst personas with different expertise areas
- Each analyst generates research questions from their unique perspective (runs in parallel)
- Each analyst searches for information independently using DuckDuckGo (runs in parallel)
- Each analyst synthesizes answers based on their findings (runs in parallel)

All of this happens simultaneously - multiple agents working at the same time to cover different angles of the topic, rather than one after another.

**Fan-in phase:**

- All analyst perspectives are collected and merged
- The system writes three sections in parallel: introduction, body, and conclusion (all run simultaneously)
- Everything gets combined into a final comprehensive report

The entire process streams in real-time, with token-by-token streaming for the final report. You see progress indicators at each stage, and tool messages show what's happening behind the scenes.

## Tech stack

- **Backend**: LangGraph (fan-in/fan-out orchestration), LangChain, OpenAI GPT-4o-mini, PostgreSQL
- **Frontend**: Next.js, React, TypeScript
- **Styling**: Tailwind CSS, CSS Modules
- **Storage**: PostgreSQL for conversation state
- **Architecture**: Multi-agent system with parallel processing and streaming support

If you want to customize the behavior, most of the logic is in `server/graphs/chat.py` and `server/graphs/deep_research.py`. The frontend lives in `client/app/page.tsx`.
