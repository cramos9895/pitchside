-- Migration: Add Operational Costs to Games Table
ALTER TABLE games 
  ADD COLUMN IF NOT EXISTS ref_fee_per_game NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_field_rental_cost NUMERIC DEFAULT 0;
