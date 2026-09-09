INSERT INTO user_roles (id, role)
SELECT id, 'business_owner' FROM business_owners
ON CONFLICT (id) DO NOTHING;
