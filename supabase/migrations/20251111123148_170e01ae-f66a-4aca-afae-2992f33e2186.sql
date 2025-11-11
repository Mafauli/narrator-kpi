-- Move pg_net extension from public to extensions schema
-- This resolves the security linter warning about extensions in public schema

-- First, create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Drop the extension from public schema
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Recreate it in the extensions schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Set default privileges for future objects in extensions schema
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;