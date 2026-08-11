-- Enable required extensions for AssetFlow
-- btree_gist is needed for the booking overlap exclusion constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;
