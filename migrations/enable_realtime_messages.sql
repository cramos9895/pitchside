-- Enable Realtime for the messages table
-- This allows clients to listen for INSERT/UPDATE/DELETE events

-- Add table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
