-- Check current state
SELECT
    u.id,
    u.email,
    p.organization_id,
    p.role,
    o.name as org_name
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id;

-- Check if organizations exist
SELECT * FROM organizations;

-- If your profile doesn't exist, create it:
INSERT INTO profiles (id, organization_id, role)
SELECT
    u.id,
    (SELECT id FROM organizations LIMIT 1),
    'owner'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = u.id);

-- If your profile exists but has no organization, update it:
UPDATE profiles
SET
    organization_id = (SELECT id FROM organizations LIMIT 1),
    role = 'owner'
WHERE organization_id IS NULL;

-- Verify the fix
SELECT
    u.email,
    p.role,
    o.name as organization
FROM auth.users u
JOIN profiles p ON p.id = u.id
JOIN organizations o ON o.id = p.organization_id;
