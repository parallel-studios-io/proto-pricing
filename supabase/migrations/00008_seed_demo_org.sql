-- Migration: Seed Demo Organization
-- Creates a demo organization for testing without auth

-- Create demo organization
INSERT INTO organizations (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'MyParcel Demo',
  'myparcel-demo',
  '{"demo": true, "scale": 0.1}'
)
ON CONFLICT (slug) DO NOTHING;

-- Note: Additional seed data (customers, products, ontology) will be
-- populated via the /api/seed endpoint which runs the synthetic data generators
