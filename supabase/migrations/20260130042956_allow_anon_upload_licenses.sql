-- anon 사용자도 public 버킷의 licenses 폴더에 업로드 허용
CREATE POLICY "Allow signup license upload" ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'public' AND (storage.foldername(name))[1] = 'licenses');
