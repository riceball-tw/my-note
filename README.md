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
```

Search for online JWT secret generator or generate by using node script.

``` bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

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
        text text "Optional text content"
        timestamp created_at "Default to current date, not null"
        timestamp updated_at "Default to current date, updates automatically"
    }

    USERS ||--o{ NOTES : "has many"
```