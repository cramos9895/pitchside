-- Add new financial and uniform options to games table
ALTER TABLE games
ADD COLUMN IF NOT EXISTS uniforms_provided BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS uniform_colors TEXT[],
ADD COLUMN IF NOT EXISTS pass_processing_fees BOOLEAN DEFAULT false;
