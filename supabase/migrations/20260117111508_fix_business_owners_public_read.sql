-- Drop the restrictive policy
DROP POLICY IF EXISTS "Allow public read access to business_owners" ON business_owners;

-- Create a more permissive policy for public reads (product listing needs to show business owner info)
CREATE POLICY "Allow public read access to business_owners" ON business_owners
FOR SELECT USING (true);

-- Also add anon access policy for product_unavailable_dates (needed for product detail page)
CREATE POLICY "Allow public read access to product_unavailable_dates" ON product_unavailable_dates
FOR SELECT USING (true);
