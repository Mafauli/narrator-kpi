-- Create storage bucket for brief audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'briefs-audio',
  'briefs-audio',
  true,
  10485760, -- 10MB limit
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
);

-- RLS policies for briefs-audio bucket
CREATE POLICY "Users can upload their own brief audio"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'briefs-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own brief audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'briefs-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view public brief audio"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'briefs-audio');

CREATE POLICY "Users can update their own brief audio"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'briefs-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own brief audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'briefs-audio' AND
  (storage.foldername(name))[1] = auth.uid()::text
);