-- Add score columns to games table
ALTER TABLE games 
ADD COLUMN score_team_a integer DEFAULT NULL,
ADD COLUMN score_team_b integer DEFAULT NULL;
