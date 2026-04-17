-- 1. Enable RLS on the site_content table
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

-- 2. Create SELECT policy for public/anon read access
CREATE POLICY "Public can view site content"
ON public.site_content
FOR SELECT
USING (true);

-- 3. Create UPDATE policy for authenticated admins
CREATE POLICY "Admins can update site content"
ON public.site_content
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'master_admin')
  )
);

-- 4. Ensure a default row exists to prevent empty reads
INSERT INTO public.site_content (id, hero_headline, hero_subtext, hero_image_url, how_it_works_image_url, testimonial_text)
VALUES (
  1,
  'The Premier Pickup Soccer Experience in the Northwest Suburbs',
  'Join local games, track your stats, and play whenever you want. No long-term commitments, just great football.',
  '',
  '',
  'Pitch Side completely changed my Thursdays. The games are organized, competitive, and super easy to join.'
)
ON CONFLICT (id) DO NOTHING;

-- 5. Set up Storage Bucket for public assets (if not already created)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 6. RLS for Storage Objects (public read, admin write/update/delete)
CREATE POLICY "Allow public viewing of public-assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-assets');

CREATE POLICY "Allow authenticated admins to insert to public-assets" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'public-assets' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'master_admin')
    )
  );

CREATE POLICY "Allow authenticated admins to update public-assets" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'public-assets' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'master_admin')
    )
  );

CREATE POLICY "Allow authenticated admins to delete public-assets" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'public-assets' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'master_admin')
    )
  );
