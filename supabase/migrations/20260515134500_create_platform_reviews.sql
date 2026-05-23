-- Create platform_reviews table
CREATE TABLE IF NOT EXISTS public.platform_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  text TEXT NOT NULL,
  role TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  is_approved BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.platform_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Anyone can read approved reviews
CREATE POLICY "Anyone can read approved reviews"
  ON public.platform_reviews
  FOR SELECT
  USING (is_approved = true);

-- 2. Authenticated users can insert their own reviews
CREATE POLICY "Users can insert their own reviews"
  ON public.platform_reviews
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 3. Admins can do everything
CREATE POLICY "Admins have full access to reviews"
  ON public.platform_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND system_role = 'admin'
    )
  );

-- Seed with some initial approved reviews if table is empty
INSERT INTO public.platform_reviews (author_name, text, role, rating, is_approved)
SELECT 'Marcus T.', 'The first platform that actually understands how much of a nightmare it is to herd 12 guys for a Sunday league. Command Center is a lifesaver.', 'League Captain', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_reviews LIMIT 1);

INSERT INTO public.platform_reviews (author_name, text, role, rating, is_approved)
SELECT 'David L.', 'I just show up, scan the lobby, and play. No more texting three different group chats trying to find a pickup game with an open spot.', 'Free Agent', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_reviews WHERE author_name = 'David L.');

INSERT INTO public.platform_reviews (author_name, text, role, rating, is_approved)
SELECT 'Sarah J.', 'Finally, a system that handles the payouts and the waivers before anyone even steps on the turf. Flawless execution.', 'Facility Manager', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_reviews WHERE author_name = 'Sarah J.');

INSERT INTO public.platform_reviews (author_name, text, role, rating, is_approved)
SELECT 'Chris R.', 'PitchSide completely eliminated the ''who paid and who owes'' argument. Stripe handles it, I just set the lineup.', 'Team Captain', 5, true
WHERE NOT EXISTS (SELECT 1 FROM public.platform_reviews WHERE author_name = 'Chris R.');
