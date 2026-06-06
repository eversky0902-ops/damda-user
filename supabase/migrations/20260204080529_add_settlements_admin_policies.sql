-- Add INSERT policy for admins
CREATE POLICY "Admins can insert settlements" ON settlements
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Add UPDATE policy for admins
CREATE POLICY "Admins can update settlements" ON settlements
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);

-- Add DELETE policy for admins
CREATE POLICY "Admins can delete settlements" ON settlements
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admins
    WHERE admins.id = auth.uid() AND admins.is_active = true
  )
);
