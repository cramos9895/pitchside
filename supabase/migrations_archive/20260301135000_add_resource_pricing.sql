-- Add baseline pricing to resource_types so the Marketplace knows how much an open slot costs.
ALTER TABLE resource_types ADD COLUMN default_hourly_rate numeric DEFAULT 100.00;
