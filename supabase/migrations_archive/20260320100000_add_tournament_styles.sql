-- Add Tournament Constraints
ALTER TABLE games
ADD COLUMN tournament_style TEXT DEFAULT 'group_stage',
ADD COLUMN minimum_games_per_team INTEGER DEFAULT 3;
