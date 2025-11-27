# BEC Aquaculture Management System

A comprehensive task management system for aquaculture operations, built with Nuxt 4 and Supabase.

## Features

- **Project-Based Task Management**: Flexible template system for lifecycle, recurring, and daily tasks
- **Role-Based Access**: Admin and worker roles with appropriate permissions
- **Real-Time Updates**: Live task and project updates using Supabase Realtime
- **Offline Support**: Work offline with automatic sync when connection is restored
- **Time Window Organization**: Tasks organized by morning, midday, afternoon, and evening
- **Phase Management**: Track project progress through customizable phases
- **Domain-Specific**: Built for aquaculture with support for tanks, mated pairs, and hatch tracking

## Tech Stack

- **Frontend**: Nuxt 4 + Vue 3
- **UI Library**: daisyUI (Tailwind CSS)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **State Management**: Nuxt 4 useState (built-in)
- **Language**: JavaScript (no TypeScript)

## Project Structure

```
BECApp/
├── app/                       # Nuxt 4 app directory
│   ├── app.vue               # Root app component
│   ├── assets/               # Static assets
│   │   └── css/             # CSS files
│   ├── components/           # Vue components
│   ├── composables/          # Composable functions
│   │   ├── useAuth.js       # Authentication composable
│   │   └── useSupabaseClient.js # Supabase client composable
│   ├── layouts/              # Layout components
│   │   ├── default.vue      # Main app layout
│   │   └── admin.vue        # Admin layout
│   ├── middleware/           # Route middleware
│   │   ├── auth.js          # Authentication check
│   │   ├── guest.js         # Guest-only routes
│   │   └── admin.js         # Admin-only routes
│   ├── pages/                # Application pages
│   │   ├── index.vue        # Dashboard
│   │   ├── auth/
│   │   │   ├── login.vue   # Login page
│   │   │   └── callback.vue # Auth callback
│   │   ├── tasks/           # Task management
│   │   ├── projects/        # Project management
│   │   ├── pairs/           # Mated pairs
│   │   └── admin/           # Admin pages
│   ├── plugins/              # Nuxt plugins
│   │   └── supabase.client.js # Supabase initialization
│   └── composables/          # Composable functions (state management)
│       ├── useAuth.js       # Authentication composable
│       ├── useTasks.js      # Tasks state composable
│       ├── useProjects.js   # Projects state composable
│       └── useSync.js       # Offline sync composable
├── public/                    # Static assets
├── nuxt.config.js            # Nuxt configuration
├── schema.sql                # Database schema
└── package.json              # Dependencies
```

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

**Get your anon key**: Go to [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → Settings → API → Copy the "anon/public" key.

3. Set up the database:

Run the SQL schema in your Supabase SQL editor. The schema file is located at `schema.sql`.

4. (Optional) Set up Supabase MCP for Cursor:

See `MCP_SETUP.md` for instructions on configuring Supabase MCP in Cursor IDE for enhanced AI assistance.

5. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Development Phases

### Phase 1: Foundation Setup ✅
- Nuxt 4 with JavaScript configuration
- Supabase integration
- Authentication system
- Role-based middleware
- Layouts and navigation
- useState composables for state management

### Phase 2: Admin Template Builder
- Template CRUD operations
- Phase management
- Task builder with drag-and-drop
- Preview functionality

### Phase 3: Task Generation Engine
- Daily task generation algorithm
- Supabase Edge Functions
- Automated scheduling

### Phase 4: Project Management
- Create projects from templates
- Phase advancement
- Project history tracking

### Phase 5: Daily Task Workflow
- Task completion interface
- Time window grouping
- Check-in/out system

### Phase 6: Domain-Specific Features
- Tank management
- Mated pairs
- Hatch tracking and analytics

### Phase 7: Offline Support
- IndexedDB caching
- Service worker
- Sync queue with conflict resolution

### Phase 8: Admin Dashboard
- User management
- Analytics and metrics
- System health monitoring

### Phase 9: Polish & Enhancement
- Calendar view
- Notifications
- Mobile optimization
- Performance tuning

## Core Concepts

### Project Templates

Templates define workflows that can be instantiated as projects. Three types:

1. **Lifecycle**: One-time sequential workflows (e.g., clownfish hatch lifecycle)
2. **Recurring Interval**: Repeat every N days (e.g., tank cleaning every 4 days)
3. **Recurring Daily**: Repeat every day (e.g., opening/closing checklists)

### Phases

Each template has one or more phases that define stages of the workflow. Phases can:

- Auto-advance after a set duration
- Require manual advancement
- Generate different tasks based on frequency settings

### Tasks

Tasks are generated daily based on active projects and their current phase. Tasks can be:

- Scheduled for specific times
- Assigned to time windows (morning, midday, afternoon, evening)
- Marked as pending, in progress, completed, skipped, or cancelled
- Required to have completion notes

## Authentication

The app uses Supabase Auth with email/password authentication. Two roles are supported:

- **Admin**: Full access to all features including template management, user management, and system configuration
- **Worker**: Access to daily tasks, projects, and domain-specific features

## Contributing

This is a custom internal application. Please follow the existing code style and patterns when making changes.

## License

Proprietary - All rights reserved
