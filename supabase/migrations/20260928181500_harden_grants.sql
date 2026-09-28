-- Already applied to live DB on 2026-09-28 as migration 'harden_grants'.
-- Removes TRUNCATE/REFERENCES/TRIGGER (which bypass RLS) from client roles on checklist tables,
-- and locks down the messages trigger function.
revoke truncate, references, trigger on public.checklist_days, public.checklist_items from authenticated, anon;
revoke execute on function public.messages_set_agent_status_fn() from public, anon, authenticated;
