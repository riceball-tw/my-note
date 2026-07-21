## MyNote

![App demo](assets/demo.png)

A MySQL + Drizzle ORM + Nuxt 3 fullstack modern note site.

## Features

- Nuxt 3 Universal Rendering mode, support both SSR and CSR
- TypeScript + Drizzle ORM + Zod for Safety
- Tailwind + Shadcn Vue for fast UI iteration
- JWT based Auth
- RWD UI for mobile and desktop

## How to Start

### Install Dependence

```bash
pnpm install
```

### Setup `.env`

```bash
DATABASE_URL=mysql://user:password@localhost:3306/your_database
JWT_SECRET=***

# Local Ollama assistant (defaults shown)
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
```

Search for online JWT secret generator or generate by using node script.

``` bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Setup the AI assistant (Ollama)

The in-app AI chat runs a server-side LangChain agent backed by a local
[Ollama](https://ollama.com) instance. Install Ollama, then pull the model:

```bash
ollama pull qwen3:8b
```

Ollama must be running and reachable from the Nuxt server process at
`OLLAMA_BASE_URL`. The assistant can search, read, create, update, and
(with a two-step confirmation) delete notes for the signed-in user only.

### Database Migrations

For more, you can refer to [drizzle migrations document](https://orm.drizzle.team/docs/migrations)

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

### Start the dev server!

```bash
pnpm dev
```

## Database Schema

```mermaid
erDiagram
    USERS {
        int id PK "Auto-increment primary key"
        varchar email "Unique and not null"
        varchar password "Not null"
    }
    NOTES {
        int id PK "Serial primary key"
        int user_id FK "Foreign key references USERS.id"
        varchar title "Note title, defaults to 'Untitled note'"
        text text "Optional text content"
        timestamp created_at "Default to current date, not null"
        timestamp updated_at "Default to current date, updates automatically"
    }

    USERS ||--o{ NOTES : "has many"
```