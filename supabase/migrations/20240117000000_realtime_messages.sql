-- Enable Realtime for messages table so coach and client get live updates
-- If this fails (e.g. table already in publication), run in Supabase Dashboard: Realtime -> Add table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
