# Supabase MCP Setup Guide

This project is configured to work with Supabase MCP (Model Context Protocol) in Cursor IDE.

## Supabase Project Details

- **Project URL**: https://janwtypmneybfzeiauzt.supabase.co
- **Project Reference**: `janwtypmneybfzeiauzt`

## Setting Up MCP in Cursor

### Step 1: Get Your Supabase Anon Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `janwtypmneybfzeiauzt`
3. Navigate to **Settings** → **API**
4. Copy the **anon/public** key
5. Add it to your `.env` file:

```env
SUPABASE_URL=https://janwtypmneybfzeiauzt.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
```

### Step 2: Configure MCP in Cursor

1. Open Cursor Settings (File → Preferences → Settings, or `Ctrl+,`)
2. Search for "MCP" or "Model Context Protocol"
3. Add the Supabase MCP server configuration:

**Option A: Via Cursor Settings UI**
- Look for "MCP Servers" or "Model Context Protocol" section
- Add a new server with:
  - Name: `supabase`
  - Type: `supabase`
  - Project URL: `https://janwtypmneybfzeiauzt.supabase.co`

**Option B: Via Cursor Config File**
1. Copy `.cursor/mcp.json.example` to `.cursor/mcp.json` (or create it in your Cursor settings directory)
2. Add your Supabase anon key to the environment variables:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server"
      ],
      "env": {
        "SUPABASE_URL": "https://janwtypmneybfzeiauzt.supabase.co",
        "SUPABASE_ANON_KEY": "your_anon_key_here"
      }
    }
  }
}
```

**Note**: The MCP configuration location may vary. Check Cursor's documentation for the exact location of MCP server configuration files.

### Step 3: Authenticate

1. Cursor will prompt you to authenticate with Supabase
2. Log in with your Supabase account
3. Select the correct organization and project (`janwtypmneybfzeiauzt`)

### Step 4: Verify Connection

Once configured, you can test the MCP connection by asking Cursor to:
- Query your database schema
- List tables
- Describe table structures
- Generate queries based on your schema

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit your `.env` file** - It's already in `.gitignore`
2. **Use the anon key for client-side** - This is safe for public use with RLS policies
3. **Service role key** - Keep this secret and never expose it to the client
4. **RLS Policies** - Ensure Row Level Security is properly configured in your database

## Database Schema

The database schema is defined in `schema.sql`. Run this in your Supabase SQL editor to set up all tables, types, and RLS policies.

## Troubleshooting

### MCP Not Connecting

1. Verify your Supabase URL is correct
2. Check that your anon key is valid
3. Ensure you're authenticated in Cursor
4. Restart Cursor after configuration changes

### Permission Issues

1. Check RLS policies in Supabase dashboard
2. Verify your user role in the database
3. Ensure the anon key has appropriate permissions

## Resources

- [Supabase MCP Documentation](https://supabase.com/docs/guides/getting-started/mcp)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Cursor MCP Setup Guide](https://docs.cursor.com)

