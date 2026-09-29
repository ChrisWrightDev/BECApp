# Blue Eyed Clowns Hatchery App

Mobile-first hatchery app for Blue Eyed Clowns. Built with Nuxt 4, daisyUI, and Supabase.

## Features

- **Home**: Hero and live summary of current hatch batches
- **Hatches**: Read-only list and detail for `hatch_batches`
- **Checklists**: Daily published checklist with realtime updates
- **Chat**: iMessage-style ops chat with realtime and optimistic sends
- **Pairs**: Mated pair tracking and tank management
- **Admin**: Users and tanks (admins only)
- **Auth**: Persistent sessions, password reset, and PWA install

## Tech Stack

- **Frontend**: Nuxt 4 + Vue 3
- **UI Library**: daisyUI (Tailwind CSS)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Nuxt 4 useState (built-in)
- **Language**: JavaScript (no TypeScript)

## Setup

### Prerequisites

- Node.js 18+
- npm, pnpm, yarn, or bun
- Supabase account and project

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file in the root directory (copy from `.env.example`):

```env
SUPABASE_URL=https://janwtypmneybfzeiauzt.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Authentication

The app uses Supabase Auth with email/password authentication. Two roles are supported:

- **Admin**: Users, tanks, and the Admin top-bar link
- **Worker**: Home, checklists, chat, hatches, and pairs

## License

Proprietary - All rights reserved
