-- Create storage bucket for banking documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('banking-documents', 'banking-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for banking documents bucket
CREATE POLICY "Users can upload their own banking documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'banking-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own banking documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'banking-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own banking documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'banking-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);