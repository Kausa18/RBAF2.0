-- Insert test provider
USE road_assistance_app;

INSERT INTO users (name, email, password, phone, role, email_verified, phone_verified, is_active, created_at, updated_at)
VALUES ('Test Provider', 'provider@test.com', '$2b$10$examplehash', '1234567890', 'provider', 1, 1, 1, NOW(), NOW());

SET @user_id = LAST_INSERT_ID();

INSERT INTO service_providers (
  user_id, business_name, service_area, service_types, experience_years,
  license_number, business_registration, tax_id, status, is_available,
  latitude, longitude, coverage_radius, last_location_update, business_description,
  operating_hours, emergency_available, average_rating, total_jobs_completed,
  total_jobs_cancelled, response_time_avg, service_fee_rate, created_at, updated_at
) VALUES (
  @user_id, 'Test Road Assist', 'Test Area', '["Towing", "Battery", "Flat Tire"]', 5,
  'LIC123', 'REG456', 'TAX789', 'approved', 1,
  37.7749, -122.4194, 50, NOW(), 'Professional road assistance services',
  '{"monday": "9-17", "tuesday": "9-17"}', 1, 4.5, 25,
  2, 15, 50.00, NOW(), NOW()
);