-- Run this AFTER 001_initial_schema.sql
-- Links your existing user to your organization

-- Step 1: Create your organization (skip if you already have one)
INSERT INTO organizations (name, slug)
VALUES ('My Agency', 'my-agency')
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Link your user to the organization
-- Replace the email with YOUR email address
UPDATE profiles
SET
    organization_id = (SELECT id FROM organizations WHERE slug = 'my-agency'),
    role = 'owner'
WHERE id = (
    SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL_HERE'
);

-- Verify it worked
SELECT
    p.id,
    u.email,
    p.role,
    o.name as organization_name
FROM profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN organizations o ON o.id = p.organization_id;
