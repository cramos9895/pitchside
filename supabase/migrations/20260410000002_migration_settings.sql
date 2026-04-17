
-- Add jersey_number and notifications_settings to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS jersey_number integer,
ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"game_reminders": true, "announcements": true}'::jsonb;
