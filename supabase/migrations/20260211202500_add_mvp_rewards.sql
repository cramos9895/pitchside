-- Add has_mvp_reward to games table
ALTER TABLE games ADD COLUMN has_mvp_reward BOOLEAN DEFAULT false;

-- Add free_game_credits to profiles table
ALTER TABLE profiles ADD COLUMN free_game_credits INTEGER DEFAULT 0;
