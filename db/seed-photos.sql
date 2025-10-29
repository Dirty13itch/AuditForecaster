-- Photo Documentation System - Seed Data
-- Purpose: Realistic test scenarios for photo uploads, tagging, OCR, annotations, albums
-- Scenarios: 12 comprehensive test cases covering all photo workflows

-- ==============================================
-- SCENARIO 1: Basic Job Photos (Equipment Focus)
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, full_url, hash, caption, tags, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-001', 'job-001', 'public/photos/job-001/furnace-dataplate.jpg', 'public/photos/job-001/furnace-dataplate-thumb.jpg', 
   'https://storage.googleapis.com/repl-default-bucket-xyz/public/photos/job-001/furnace-dataplate.jpg',
   'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345', 
   'Furnace data plate showing 80k BTU rating and 96% AFUE', 
   ARRAY['Equipment', 'Furnace', 'Data Plate'], 
   2048000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '2 days', 'user-001'),
   
  ('photo-002', 'job-001', 'public/photos/job-001/furnace-overview.jpg', 'public/photos/job-001/furnace-overview-thumb.jpg',
   'https://storage.googleapis.com/repl-default-bucket-xyz/public/photos/job-001/furnace-overview.jpg',
   'def456abc789def456abc789def456abc789def456abc789def456abc789def45678',
   'Furnace installation overview in mechanical room',
   ARRAY['Equipment', 'Furnace', 'Installation'],
   1856000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '2 days', 'user-001'),
   
  ('photo-003', 'job-001', 'public/photos/job-001/thermostat.jpg', 'public/photos/job-001/thermostat-thumb.jpg',
   'https://storage.googleapis.com/repl-default-bucket-xyz/public/photos/job-001/thermostat.jpg',
   'ghi789abc123ghi789abc123ghi789abc123ghi789abc123ghi789abc123ghi78912',
   'Programmable thermostat showing heating mode',
   ARRAY['Equipment', 'Thermostat'],
   1024000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '2 days', 'user-001');

-- ==============================================
-- SCENARIO 2: Photos with OCR Data
-- Equipment labels with extracted text
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, ocr_text, ocr_confidence, ocr_metadata, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-004', 'job-002', 'public/photos/job-002/water-heater-label.jpg', 'public/photos/job-002/water-heater-label-thumb.jpg',
   'jkl012def345jkl012def345jkl012def345jkl012def345jkl012def345jkl01234',
   'Water heater nameplate with serial number',
   ARRAY['Equipment', 'Water Heater', 'Data Plate', 'Serial Number'],
   E'MODEL: AO-SMITH-50\nSERIAL: WH123456789\nGALLONS: 50\nBTU: 40,000\nYEAR: 2022',
   92.5,
   jsonb_build_object(
     'blocks', jsonb_build_array(
       jsonb_build_object('text', 'MODEL: AO-SMITH-50', 'confidence', 95, 'boundingBox', jsonb_build_object('x', 50, 'y', 20, 'width', 200, 'height', 30)),
       jsonb_build_object('text', 'SERIAL: WH123456789', 'confidence', 98, 'boundingBox', jsonb_build_object('x', 50, 'y', 60, 'width', 250, 'height', 30)),
       jsonb_build_object('text', 'BTU: 40,000', 'confidence', 88, 'boundingBox', jsonb_build_object('x', 50, 'y', 100, 'width', 150, 'height', 30))
     ),
     'language', 'eng',
     'processingTime', 2340
   ),
   2200000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '1 day', 'user-002'),
   
  ('photo-005', 'job-002', 'public/photos/job-002/air-handler-rating.jpg', 'public/photos/job-002/air-handler-rating-thumb.jpg',
   'mno345ghi678mno345ghi678mno345ghi678mno345ghi678mno345ghi678mno34567',
   'Air handler rating plate showing tonnage',
   ARRAY['Equipment', 'Air Handler', 'Data Plate'],
   E'MODEL: CARRIER-AH-30\nSERIAL: AH987654321\nTONS: 3.0\nVOLTS: 240\nAMPS: 15',
   88.0,
   jsonb_build_object(
     'blocks', jsonb_build_array(
       jsonb_build_object('text', 'MODEL: CARRIER-AH-30', 'confidence', 90, 'boundingBox', jsonb_build_object('x', 60, 'y', 25, 'width', 220, 'height', 28)),
       jsonb_build_object('text', 'TONS: 3.0', 'confidence', 94, 'boundingBox', jsonb_build_object('x', 60, 'y', 95, 'width', 120, 'height', 28))
     )
   ),
   1950000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '1 day', 'user-002');

-- ==============================================
-- SCENARIO 3: Photos with Annotations
-- Canvas annotations for defects and measurements
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, annotation_data, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-006', 'job-003', 'public/photos/job-003/ductwork-leak.jpg', 'public/photos/job-003/ductwork-leak-thumb.jpg',
   'pqr678jkl901pqr678jkl901pqr678jkl901pqr678jkl901pqr678jkl901pqr67890',
   'Ductwork connection showing air leakage',
   ARRAY['Ductwork', 'Issue', 'Leak'],
   jsonb_build_object(
     'version', '1.0',
     'objects', jsonb_build_array(
       jsonb_build_object(
         'type', 'arrow',
         'id', 'arrow-1',
         'points', jsonb_build_array(150, 120, 280, 220),
         'stroke', '#FF0000',
         'strokeWidth', 3,
         'pointerLength', 10,
         'pointerWidth', 10
       ),
       jsonb_build_object(
         'type', 'text',
         'id', 'text-1',
         'x', 290,
         'y', 210,
         'text', 'Unsealed connection',
         'fontSize', 18,
         'fill', '#FF0000',
         'fontFamily', 'Arial'
       ),
       jsonb_build_object(
         'type', 'rect',
         'id', 'rect-1',
         'x', 140,
         'y', 110,
         'width', 160,
         'height', 130,
         'stroke', '#FF0000',
         'strokeWidth', 2,
         'dash', jsonb_build_array(5, 5)
       )
     )
   ),
   1875000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '3 hours', 'user-003'),
   
  ('photo-007', 'job-003', 'public/photos/job-003/insulation-gap.jpg', 'public/photos/job-003/insulation-gap-thumb.jpg',
   'stu901mno234stu901mno234stu901mno234stu901mno234stu901mno234stu90123',
   'Insulation gap in attic requiring attention',
   ARRAY['Insulation', 'Attic', 'Issue', 'Gap'],
   jsonb_build_object(
     'version', '1.0',
     'objects', jsonb_build_array(
       jsonb_build_object(
         'type', 'circle',
         'id', 'circle-1',
         'x', 400,
         'y', 350,
         'radius', 40,
         'stroke', '#FF0000',
         'strokeWidth', 3
       ),
       jsonb_build_object(
         'type', 'text',
         'id', 'text-2',
         'x', 450,
         'y', 350,
         'text', 'R-38 gap - needs fill',
         'fontSize', 16,
         'fill', '#FF0000'
       )
     )
   ),
   2100000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '3 hours', 'user-003');

-- ==============================================
-- SCENARIO 4: Before/After Paired Photos
-- Dual capture with matching timestamps
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, file_size, mime_type, width, height, uploaded_at, uploaded_by, location)
VALUES
  ('photo-008', 'job-004', 'public/photos/job-004/attic-before.jpg', 'public/photos/job-004/attic-before-thumb.jpg',
   'vwx234pqr567vwx234pqr567vwx234pqr567vwx234pqr567vwx234pqr567vwx23456',
   'Attic insulation before upgrade',
   ARRAY['Insulation', 'Attic', 'Before'],
   1720000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '5 hours', 'user-004', 'Attic - North Section'),
   
  ('photo-009', 'job-004', 'public/photos/job-004/attic-after.jpg', 'public/photos/job-004/attic-after-thumb.jpg',
   'yza567stu890yza567stu890yza567stu890yza567stu890yza567stu890yza56789',
   'Attic insulation after R-49 upgrade',
   ARRAY['Insulation', 'Attic', 'After'],
   1850000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '4 hours 50 minutes', 'user-004', 'Attic - North Section'),
   
  ('photo-010', 'job-004', 'public/photos/job-004/duct-seal-before.jpg', 'public/photos/job-004/duct-seal-before-thumb.jpg',
   'bcd890vwx123bcd890vwx123bcd890vwx123bcd890vwx123bcd890vwx123bcd89012',
   'Ductwork connection before sealing',
   ARRAY['Ductwork', 'Before'],
   1650000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '4 hours 30 minutes', 'user-004', 'Basement'),
   
  ('photo-011', 'job-004', 'public/photos/job-004/duct-seal-after.jpg', 'public/photos/job-004/duct-seal-after-thumb.jpg',
   'efg123yza456efg123yza456efg123yza456efg123yza456efg123yza456efg12345',
   'Ductwork connection after mastic sealing',
   ARRAY['Ductwork', 'After'],
   1780000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '4 hours 25 minutes', 'user-004', 'Basement');

-- ==============================================
-- SCENARIO 5: Favorite Photos (Starred)
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, is_favorite, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-012', 'job-001', 'public/photos/job-001/perfect-install.jpg', 'public/photos/job-001/perfect-install-thumb.jpg',
   'hij456bcd789hij456bcd789hij456bcd789hij456bcd789hij456bcd789hij45678',
   'Perfect furnace installation - use for training',
   ARRAY['Equipment', 'Furnace', 'Installation', 'Best Practice'],
   true,
   2250000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '2 days', 'user-001'),
   
  ('photo-013', 'job-002', 'public/photos/job-002/excellent-ductwork.jpg', 'public/photos/job-002/excellent-ductwork-thumb.jpg',
   'klm789efg012klm789efg012klm789efg012klm789efg012klm789efg012klm78901',
   'Excellent ductwork installation showing proper support',
   ARRAY['Ductwork', 'Installation', 'Best Practice'],
   true,
   2100000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '1 day', 'user-002');

-- ==============================================
-- SCENARIO 6: Photo Albums
-- ==============================================
INSERT INTO photo_albums (id, name, description, cover_photo_id, created_by, created_at, updated_at)
VALUES
  ('album-001', 'Equipment Data Plates Q1 2025', 'All equipment identification photos for quarterly presentation', 'photo-001', 'user-001', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),
  ('album-002', 'Best Practice Examples', 'Top-quality installations for training materials', 'photo-012', 'user-admin', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('album-003', 'Defects & Issues', 'Documentation of common defects for inspector training', 'photo-006', 'user-admin', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

-- Link photos to albums
INSERT INTO photo_album_items (id, album_id, photo_id, order_index, added_at)
VALUES
  ('album-item-001', 'album-001', 'photo-001', 0, NOW() - INTERVAL '7 days'),
  ('album-item-002', 'album-001', 'photo-004', 1, NOW() - INTERVAL '6 days'),
  ('album-item-003', 'album-001', 'photo-005', 2, NOW() - INTERVAL '6 days'),
  
  ('album-item-004', 'album-002', 'photo-012', 0, NOW() - INTERVAL '5 days'),
  ('album-item-005', 'album-002', 'photo-013', 1, NOW() - INTERVAL '5 days'),
  ('album-item-006', 'album-002', 'photo-001', 2, NOW() - INTERVAL '5 days'),
  
  ('album-item-007', 'album-003', 'photo-006', 0, NOW() - INTERVAL '3 days'),
  ('album-item-008', 'album-003', 'photo-007', 1, NOW() - INTERVAL '3 days');

-- ==============================================
-- SCENARIO 7: Upload Sessions (Cleanup Tracking)
-- ==============================================
INSERT INTO upload_sessions (id, timestamp, photo_count, job_id, acknowledged, acknowledged_at)
VALUES
  ('upload-session-001', NOW() - INTERVAL '2 days', 3, 'job-001', true, NOW() - INTERVAL '1 day 12 hours'),
  ('upload-session-002', NOW() - INTERVAL '1 day', 2, 'job-002', true, NOW() - INTERVAL '12 hours'),
  ('upload-session-003', NOW() - INTERVAL '5 hours', 4, 'job-004', false, NULL);

INSERT INTO photo_upload_sessions (id, user_id, session_id, upload_date, photo_count, device_info, reminder_sent, cleanup_confirmed, created_at, updated_at)
VALUES
  ('photo-session-001', 'user-001', 'upload-session-001', NOW() - INTERVAL '2 days', 3, 
   jsonb_build_object('type', 'mobile', 'os', 'iOS 17', 'browser', 'Safari'), 
   true, true, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day 12 hours'),
   
  ('photo-session-002', 'user-002', 'upload-session-002', NOW() - INTERVAL '1 day', 2,
   jsonb_build_object('type', 'mobile', 'os', 'Android 14', 'browser', 'Chrome'),
   true, true, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours'),
   
  ('photo-session-003', 'user-004', 'upload-session-003', NOW() - INTERVAL '5 hours', 4,
   jsonb_build_object('type', 'mobile', 'os', 'iOS 17', 'browser', 'Safari'),
   false, false, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours');

-- ==============================================
-- SCENARIO 8: Duplicate Photo (Same Hash)
-- Demonstrates duplicate detection
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-014', 'job-001', 'public/photos/job-001/furnace-dataplate-copy.jpg', 'public/photos/job-001/furnace-dataplate-copy-thumb.jpg',
   'abc123def456abc123def456abc123def456abc123def456abc123def456abc12345', -- Same hash as photo-001
   'Duplicate furnace data plate photo (accidental re-upload)',
   ARRAY['Equipment', 'Furnace', 'Data Plate'],
   2048000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '1 day 12 hours', 'user-001');

-- ==============================================
-- SCENARIO 9: High-Volume Job (Many Photos)
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-015', 'job-005', 'public/photos/job-005/exterior-01.jpg', 'public/photos/job-005/exterior-01-thumb.jpg',
   'nop456qrs789nop456qrs789nop456qrs789nop456qrs789nop456qrs789nop45678',
   'Exterior front view',
   ARRAY['Exterior'],
   1650000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '8 hours', 'user-001'),
   
  ('photo-016', 'job-005', 'public/photos/job-005/exterior-02.jpg', 'public/photos/job-005/exterior-02-thumb.jpg',
   'qrs789tuv012qrs789tuv012qrs789tuv012qrs789tuv012qrs789tuv012qrs78901',
   'Exterior rear view',
   ARRAY['Exterior'],
   1720000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '8 hours', 'user-001'),
   
  ('photo-017', 'job-005', 'public/photos/job-005/attic-01.jpg', 'public/photos/job-005/attic-01-thumb.jpg',
   'tuv012wxy345tuv012wxy345tuv012wxy345tuv012wxy345tuv012wxy345tuv01234',
   'Attic insulation west section',
   ARRAY['Insulation', 'Attic'],
   1950000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '7 hours 50 minutes', 'user-001'),
   
  ('photo-018', 'job-005', 'public/photos/job-005/attic-02.jpg', 'public/photos/job-005/attic-02-thumb.jpg',
   'wxy345zab678wxy345zab678wxy345zab678wxy345zab678wxy345zab678wxy34567',
   'Attic insulation east section',
   ARRAY['Insulation', 'Attic'],
   2010000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '7 hours 45 minutes', 'user-001'),
   
  ('photo-019', 'job-005', 'public/photos/job-005/basement-01.jpg', 'public/photos/job-005/basement-01-thumb.jpg',
   'zab678cde901zab678cde901zab678cde901zab678cde901zab678cde901zab67890',
   'Basement mechanical room overview',
   ARRAY['Basement', 'Mechanical Room'],
   1880000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '7 hours 30 minutes', 'user-001');

-- ==============================================
-- SCENARIO 10: Photos with EXIF GPS Data
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, exif_data, location, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-020', 'job-001', 'public/photos/job-001/site-location.jpg', 'public/photos/job-001/site-location-thumb.jpg',
   'cde901fgh234cde901fgh234cde901fgh234cde901fgh234cde901fgh234cde90123',
   'Site location marker',
   ARRAY['Exterior', 'Location'],
   jsonb_build_object(
     'GPSLatitude', 44.9778,
     'GPSLongitude', -93.2650,
     'GPSAltitude', 260.5,
     'DateTimeOriginal', '2025-01-27T14:30:00Z',
     'Make', 'Apple',
     'Model', 'iPhone 14 Pro',
     'LensModel', 'iPhone 14 Pro back triple camera 6.86mm f/1.78',
     'FNumber', 1.78,
     'ExposureTime', '1/120',
     'ISO', 64
   ),
   'Minneapolis, MN',
   2150000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '2 days', 'user-001');

-- ==============================================
-- SCENARIO 11: Photos with Checklist Item Links
-- ==============================================
-- Assuming checklist items exist from job seed data
INSERT INTO photos (id, job_id, checklist_item_id, file_path, thumbnail_path, hash, caption, tags, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-021', 'job-001', 'checklist-item-001', 'public/photos/job-001/checklist-photo-1.jpg', 'public/photos/job-001/checklist-photo-1-thumb.jpg',
   'fgh234ijk567fgh234ijk567fgh234ijk567fgh234ijk567fgh234ijk567fgh23456',
   'Photo required for checklist item verification',
   ARRAY['Checklist', 'Required'],
   1750000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '2 days', 'user-001'),
   
  ('photo-022', 'job-002', 'checklist-item-002', 'public/photos/job-002/checklist-photo-2.jpg', 'public/photos/job-002/checklist-photo-2-thumb.jpg',
   'ijk567lmn890ijk567lmn890ijk567lmn890ijk567lmn890ijk567lmn890ijk56789',
   'Verification photo for duct sealing requirement',
   ARRAY['Checklist', 'Required', 'Ductwork'],
   1820000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '1 day', 'user-002');

-- ==============================================
-- SCENARIO 12: Mixed Tag Coverage (Testing Tag Analytics)
-- ==============================================
INSERT INTO photos (id, job_id, file_path, thumbnail_path, hash, caption, tags, file_size, mime_type, width, height, uploaded_at, uploaded_by)
VALUES
  ('photo-023', 'job-003', 'public/photos/job-003/crawlspace.jpg', 'public/photos/job-003/crawlspace-thumb.jpg',
   'lmn890opq123lmn890opq123lmn890opq123lmn890opq123lmn890opq123lmn89012',
   'Crawlspace insulation inspection',
   ARRAY['Crawlspace', 'Insulation'],
   1680000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '6 hours', 'user-003'),
   
  ('photo-024', 'job-003', 'public/photos/job-003/garage.jpg', 'public/photos/job-003/garage-thumb.jpg',
   'opq123rst456opq123rst456opq123rst456opq123rst456opq123rst456opq12345',
   'Garage door insulation',
   ARRAY['Garage', 'Insulation'],
   1590000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '5 hours 50 minutes', 'user-003'),
   
  ('photo-025', 'job-004', 'public/photos/job-004/window.jpg', 'public/photos/job-004/window-thumb.jpg',
   'rst456uvw789rst456uvw789rst456uvw789rst456uvw789rst456uvw789rst45678',
   'Energy-efficient window installation',
   ARRAY['Windows', 'Installation'],
   1720000, 'image/jpeg', 3024, 4032, NOW() - INTERVAL '5 hours', 'user-004');

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify photos created
SELECT 
  'Photos' as entity,
  COUNT(*) as count,
  COUNT(DISTINCT job_id) as jobs_with_photos,
  COUNT(*) FILTER (WHERE ocr_text IS NOT NULL) as photos_with_ocr,
  COUNT(*) FILTER (WHERE annotation_data IS NOT NULL) as photos_with_annotations,
  COUNT(*) FILTER (WHERE is_favorite = true) as favorite_photos
FROM photos
WHERE id LIKE 'photo-%';

-- Verify albums created
SELECT 
  'Photo Albums' as entity,
  COUNT(*) as count
FROM photo_albums
WHERE id LIKE 'album-%';

-- Verify album items created
SELECT 
  'Album Items' as entity,
  COUNT(*) as count
FROM photo_album_items
WHERE id LIKE 'album-item-%';

-- Verify upload sessions created
SELECT 
  'Upload Sessions' as entity,
  COUNT(*) as upload_sessions,
  COUNT(*) as photo_upload_sessions
FROM upload_sessions
WHERE id LIKE 'upload-session-%';

-- Summary: Tag Distribution
SELECT 
  unnest(tags) as tag,
  COUNT(*) as photo_count,
  ROUND(COUNT(*)::decimal / (SELECT COUNT(*) FROM photos WHERE id LIKE 'photo-%')::decimal * 100, 2) as percentage
FROM photos
WHERE id LIKE 'photo-%'
GROUP BY unnest(tags)
ORDER BY photo_count DESC
LIMIT 15;

-- Summary: Photo Counts by Job
SELECT 
  p.job_id,
  COUNT(*) as photo_count,
  COUNT(*) FILTER (WHERE p.ocr_text IS NOT NULL) as with_ocr,
  COUNT(*) FILTER (WHERE p.annotation_data IS NOT NULL) as with_annotations,
  COUNT(*) FILTER (WHERE p.is_favorite = true) as favorites,
  array_agg(DISTINCT unnest_tag) as all_tags_used
FROM photos p
CROSS JOIN LATERAL unnest(p.tags) as unnest_tag
WHERE p.id LIKE 'photo-%'
GROUP BY p.job_id
ORDER BY photo_count DESC;

-- Summary: Duplicate Detection
SELECT 
  hash,
  COUNT(*) as duplicate_count,
  array_agg(id) as photo_ids,
  array_agg(caption) as captions
FROM photos
WHERE id LIKE 'photo-%' AND hash IS NOT NULL
GROUP BY hash
HAVING COUNT(*) > 1;

-- Summary: Before/After Pairs
SELECT 
  p1.id as before_photo,
  p1.caption as before_caption,
  p2.id as after_photo,
  p2.caption as after_caption,
  p1.location,
  p2.uploaded_at - p1.uploaded_at as time_between
FROM photos p1
JOIN photos p2 ON p1.job_id = p2.job_id AND p1.location = p2.location
WHERE p1.tags @> ARRAY['Before'] 
  AND p2.tags @> ARRAY['After']
  AND p1.id LIKE 'photo-%'
  AND p2.id LIKE 'photo-%'
ORDER BY p1.uploaded_at;

-- Summary: Album Contents
SELECT 
  a.name as album_name,
  COUNT(ai.id) as photo_count,
  array_agg(p.caption ORDER BY ai.order_index) as photo_captions
FROM photo_albums a
LEFT JOIN photo_album_items ai ON ai.album_id = a.id
LEFT JOIN photos p ON p.id = ai.photo_id
WHERE a.id LIKE 'album-%'
GROUP BY a.id, a.name
ORDER BY photo_count DESC;

-- Summary: Upload Session Stats
SELECT 
  pus.user_id,
  COUNT(*) as total_sessions,
  SUM(pus.photo_count) as total_photos,
  COUNT(*) FILTER (WHERE pus.cleanup_confirmed = true) as confirmed_cleanups,
  COUNT(*) FILTER (WHERE pus.cleanup_confirmed = false) as pending_cleanups,
  AVG(pus.photo_count) as avg_photos_per_session
FROM photo_upload_sessions pus
WHERE pus.id LIKE 'photo-session-%'
GROUP BY pus.user_id
ORDER BY total_photos DESC;

-- Summary: OCR Quality Analysis
SELECT 
  CASE 
    WHEN ocr_confidence >= 90 THEN 'Excellent (90-100%)'
    WHEN ocr_confidence >= 80 THEN 'Good (80-89%)'
    WHEN ocr_confidence >= 70 THEN 'Fair (70-79%)'
    ELSE 'Poor (<70%)'
  END as ocr_quality_tier,
  COUNT(*) as photo_count,
  AVG(ocr_confidence) as avg_confidence
FROM photos
WHERE id LIKE 'photo-%' AND ocr_text IS NOT NULL
GROUP BY ocr_quality_tier
ORDER BY avg_confidence DESC;
