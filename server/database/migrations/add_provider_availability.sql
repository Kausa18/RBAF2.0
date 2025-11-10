-- Add availability column to providers table
ALTER TABLE providers
ADD COLUMN availability ENUM('available', 'busy', 'offline') NOT NULL DEFAULT 'offline',
ADD COLUMN last_active TIMESTAMP NULL DEFAULT NULL,
ADD INDEX idx_availability (availability),
ADD INDEX idx_last_active (last_active);

-- Add indexes to improve match_providers query performance
ALTER TABLE providers
ADD INDEX idx_service_area (service_area),
ADD INDEX idx_status (status);

-- Add composite index for common query patterns
ALTER TABLE providers
ADD INDEX idx_availability_status (availability, status);