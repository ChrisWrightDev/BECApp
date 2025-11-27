# Quick Environment Setup

## Create .env File

Since `.env` files are gitignored, you need to create it manually:

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

   Or on Windows PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` and add your Supabase anon key:

   ```env
   SUPABASE_URL=https://janwtypmneybfzeiauzt.supabase.co
   SUPABASE_ANON_KEY=your_actual_anon_key_here
   ```

3. Get your anon key from:
   - Go to https://supabase.com/dashboard
   - Select project: `janwtypmneybfzeiauzt`
   - Navigate to **Settings** → **API**
   - Copy the **anon/public** key

## Verify Setup

After creating `.env`, verify it's working:

```bash
npm run dev
```

The app should start without Supabase connection warnings.

