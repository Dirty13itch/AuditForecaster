-- MileIQ Feature - Seed Data
-- Creates sample mileage log entries for testing and demonstration

-- Ensure test-admin user exists (should be created by dev mode seeding)
-- This script assumes user 'test-admin' exists

-- Clear existing test mileage data
DELETE FROM mileage_logs WHERE user_id = 'test-admin';

-- Seed: Unclassified drive (ready for classification)
INSERT INTO mileage_logs (
  id,
  user_id,
  vehicle_state,
  date,
  start_time,
  end_time,
  distance_miles,
  start_location,
  end_location,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'unclassified',
  CURRENT_DATE - INTERVAL '1 day',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '08:30:00',
  (CURRENT_DATE - INTERVAL '1 day') + TIME '09:15:00',
  12.5,
  '{"address": "123 Main St, Minneapolis, MN 55401", "lat": 44.9778, "lng": -93.2650}',
  '{"address": "456 Oak Ave, St Paul, MN 55102", "lat": 44.9537, "lng": -93.0900}',
  'Client meeting - Smith residence',
  NOW(),
  NOW()
);

-- Seed: Classified business drive (current month)
INSERT INTO mileage_logs (
  id,
  user_id,
  vehicle_state,
  purpose,
  date,
  start_time,
  end_time,
  distance_miles,
  start_location,
  end_location,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'classified',
  'business',
  CURRENT_DATE - INTERVAL '3 days',
  (CURRENT_DATE - INTERVAL '3 days') + TIME '10:00:00',
  (CURRENT_DATE - INTERVAL '3 days') + TIME '10:45:00',
  18.2,
  '{"address": "789 Elm St, Minneapolis, MN 55403"}',
  '{"address": "321 Pine Rd, Bloomington, MN 55420"}',
  'Site inspection - Johnson project',
  NOW(),
  NOW()
);

-- Seed: Classified personal drive (current month)
INSERT INTO mileage_logs (
  id,
  user_id,
  vehicle_state,
  purpose,
  date,
  start_time,
  end_time,
  distance_miles,
  start_location,
  end_location,
  notes,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'test-admin',
  'classified',
  'personal',
  CURRENT_DATE - INTERVAL '5 days',
  (CURRENT_DATE - INTERVAL '5 days') + TIME '18:30:00',
  (CURRENT_DATE - INTERVAL '5 days') + TIME '19:00:00',
  8.4,
  '{"address": "Home"}',
  '{"address": "Grocery Store"}',
  'Personal errand',
  NOW(),
  NOW()
);

-- Seed: Additional business drives for realistic monthly summary
INSERT INTO mileage_logs (
  user_id,
  vehicle_state,
  purpose,
  date,
  start_time,
  end_time,
  distance_miles,
  start_location,
  end_location
) VALUES 
  ('test-admin', 'classified', 'business', CURRENT_DATE - INTERVAL '7 days', 
   (CURRENT_DATE - INTERVAL '7 days') + TIME '09:00:00', 
   (CURRENT_DATE - INTERVAL '7 days') + TIME '09:30:00', 
   15.3, '{"address": "Office"}', '{"address": "Client Site A"}'),
   
  ('test-admin', 'classified', 'business', CURRENT_DATE - INTERVAL '9 days',
   (CURRENT_DATE - INTERVAL '9 days') + TIME '13:00:00',
   (CURRENT_DATE - INTERVAL '9 days') + TIME '14:15:00',
   22.7, '{"address": "Office"}', '{"address": "Client Site B"}'),
   
  ('test-admin', 'classified', 'business', CURRENT_DATE - INTERVAL '11 days',
   (CURRENT_DATE - INTERVAL '11 days') + TIME '08:00:00',
   (CURRENT_DATE - INTERVAL '11 days') + TIME '09:30:00',
   31.5, '{"address": "Home"}', '{"address": "Conference Center"}');

-- Verify seeded data
SELECT 
  vehicle_state,
  purpose,
  COUNT(*) as count,
  SUM(distance_miles) as total_miles
FROM mileage_logs
WHERE user_id = 'test-admin'
GROUP BY vehicle_state, purpose
ORDER BY vehicle_state, purpose;

-- Expected output:
-- vehicle_state | purpose  | count | total_miles
-- classified    | business | 4     | 87.7
-- classified    | personal | 1     | 8.4
-- unclassified  | NULL     | 1     | 12.5
