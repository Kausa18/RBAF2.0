-- Add new columns to service_providers table
ALTER TABLE service_providers
ADD COLUMN is_available BOOLEAN DEFAULT true,
ADD COLUMN last_location_update TIMESTAMP NULL,
ADD COLUMN average_rating DECIMAL(3,2) DEFAULT 0.00;

-- Add new columns to requests table
ALTER TABLE requests
ADD COLUMN rating DECIMAL(3,2) NULL,
ADD COLUMN service_fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN assigned_at TIMESTAMP NULL,
ADD COLUMN completed_at TIMESTAMP NULL,
ADD COLUMN emergency_contact VARCHAR(20),
ADD COLUMN description TEXT;

-- Create an index for faster location-based queries
CREATE INDEX idx_provider_location ON service_providers(latitude, longitude);
CREATE INDEX idx_request_status ON requests(status);

-- Update existing requests table with new status values if needed
ALTER TABLE requests MODIFY COLUMN status 
ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled') 
DEFAULT 'open';
