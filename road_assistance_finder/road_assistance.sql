-- ========== CREATE ROAD ASSISTANCE DATABASE ==========
CREATE DATABASE road_assistance_app 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE road_assistance_app;

-- ========== USERS TABLE (Handles both regular users and providers) ==========
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  emergency_contact VARCHAR(255),
  role ENUM('user', 'provider', 'admin') DEFAULT 'user',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  profile_picture VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP NULL,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
);

-- ========== SERVICE PROVIDERS TABLE ==========
CREATE TABLE service_providers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  business_name VARCHAR(255) NOT NULL,
  service_area VARCHAR(255) NOT NULL,
  service_types JSON NOT NULL,
  experience_years INT NOT NULL,
  license_number VARCHAR(100) NOT NULL,
  business_registration VARCHAR(100),
  tax_id VARCHAR(50),
  
  -- Approval System
  status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  approval_notes TEXT,
  approved_by INT NULL,
  approved_at TIMESTAMP NULL,
  
  -- Availability & Location
  is_available BOOLEAN DEFAULT FALSE,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  coverage_radius INT DEFAULT 50, -- km
  last_location_update TIMESTAMP NULL,
  
  -- Business Info
  business_description TEXT,
  operating_hours JSON, -- {"monday": "08:00-18:00", "tuesday": "08:00-18:00", ...}
  emergency_available BOOLEAN DEFAULT FALSE, -- Available 24/7 for emergencies
  
  -- Ratings & Performance
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_jobs_completed INT DEFAULT 0,
  total_jobs_cancelled INT DEFAULT 0,
  response_time_avg INT DEFAULT 0, -- minutes
  
  -- Financial (for reference only - no commission processing)
  service_fee_rate DECIMAL(5,2) DEFAULT 0.00, -- per service (reference only)
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_location (latitude, longitude),
  INDEX idx_available (is_available),
  INDEX idx_service_area (service_area)
);

-- ========== SERVICE REQUESTS TABLE ==========
CREATE TABLE service_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  provider_id INT NULL,
  
  -- Request Details
  service_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  urgency_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address TEXT NOT NULL,
  landmark VARCHAR(255),
  
  -- Status & Timeline
  status ENUM('open', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP NULL,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  cancelled_at TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Pricing (for reference only - no payment processing)
  estimated_cost DECIMAL(10, 2),
  final_cost DECIMAL(10, 2),
  payment_method ENUM('cash', 'mobile_money', 'bank_transfer', 'other') DEFAULT 'cash',
  payment_notes TEXT, -- Simple notes about payment arrangement
  
  -- Feedback
  user_rating INT CHECK (user_rating >= 1 AND user_rating <= 5),
  provider_rating INT CHECK (provider_rating >= 1 AND provider_rating <= 5),
  user_feedback TEXT,
  provider_feedback TEXT,
  
  -- Additional Info
  cancellation_reason TEXT,
  completion_notes TEXT,
  photos JSON, -- Array of photo URLs
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_provider_id (provider_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_location (latitude, longitude),
  INDEX idx_service_type (service_type)
);

-- ========== PROVIDER DOCUMENTS TABLE ==========
CREATE TABLE provider_documents (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provider_id INT NOT NULL,
  document_type ENUM('license', 'insurance', 'registration', 'id_card', 'other') NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  mime_type VARCHAR(100),
  verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
  verified_by INT NULL,
  verified_at TIMESTAMP NULL,
  rejection_reason TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (provider_id) REFERENCES service_providers(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_provider_id (provider_id),
  INDEX idx_verification_status (verification_status)
);

-- ========== NOTIFICATIONS TABLE ==========
CREATE TABLE notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('request_update', 'provider_approved', 'payment', 'system', 'promotion') NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_id INT, -- ID of related request, payment, etc.
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_is_read (is_read),
  INDEX idx_created_at (created_at)
);

-- ========== SYSTEM LOGS TABLE ==========
CREATE TABLE system_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(50),
  record_id INT,
  old_values JSON,
  new_values JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_action (action)
);

-- ========== PAYMENT TRACKING REMOVED PER USER REQUEST ==========
-- Payment will be handled externally (cash, mobile money, etc.)
-- No payment tracking tables needed

-- ========== NO SAMPLE DATA - CLEAN TABLES ==========
-- Tables are ready for your live data

-- ========== CREATE VIEWS FOR COMMON QUERIES ==========

-- View for active providers with location
CREATE VIEW active_providers AS
SELECT 
  sp.*,
  u.name as contact_name,
  u.email,
  u.phone,
  JSON_UNQUOTE(JSON_EXTRACT(sp.service_types, '$')) as services
FROM service_providers sp
JOIN users u ON sp.user_id = u.id
WHERE sp.status = 'approved' AND sp.is_available = TRUE;

-- View for request statistics
CREATE VIEW request_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_requests,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_requests,
  AVG(CASE WHEN final_cost > 0 THEN final_cost END) as avg_cost
FROM service_requests
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- ========== VERIFICATION AND FINAL STATUS ==========

-- Show all created tables
SHOW TABLES;

-- Verify table structures
SELECT 'USERS TABLE' as table_info;
DESCRIBE users;

SELECT 'SERVICE_PROVIDERS TABLE' as table_info;
DESCRIBE service_providers;

SELECT 'SERVICE_REQUESTS TABLE' as table_info;
DESCRIBE service_requests;

-- Show sample data counts
SELECT 'DATA COUNTS - All tables should be empty' as info;
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Service Providers' as table_name, COUNT(*) as count FROM service_providers
UNION ALL  
SELECT 'Service Requests' as table_name, COUNT(*) as count FROM service_requests
UNION ALL
SELECT 'Notifications' as table_name, COUNT(*) as count FROM notifications
UNION ALL
SELECT 'Provider Documents' as table_name, COUNT(*) as count FROM provider_documents;

SELECT '🎉 CLEAN DATABASE CREATED SUCCESSFULLY! 🎉' as status;
SELECT 'Ready for your live data - no mock data included' as message;