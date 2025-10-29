-- ================================================================
-- Expenses Feature - Sample Seed Data
-- ================================================================
-- Purpose: Provide realistic expense records for testing and demo
-- Usage: psql $DATABASE_URL < db/seed-expenses.sql
-- Created: October 29, 2025
-- ================================================================

-- Note: This script assumes:
-- 1. The expenses table exists (run `npm run db:push` first)
-- 2. You have at least one job in the jobs table for linking
-- 3. UUIDs are generated server-side (we use explicit UUIDs here for consistency)

BEGIN;

-- ================================================================
-- Sample Expenses for October 2025 (Current Month)
-- ================================================================

-- Expense 1: Fuel - Recent, with OCR data
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  job_id,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor,
  ocr_date
) VALUES (
  'expense-demo-fuel-001',
  'fuel',
  45.67,
  'Gas for job site travel - Shell Station',
  '2025-10-15 14:30:00',
  true,
  (SELECT id FROM jobs LIMIT 1),  -- Link to first job (if exists)
  'https://storage.googleapis.com/demo-bucket/receipts/shell-001.jpg',
  'SHELL STATION
   REGULAR UNLEADED
   GALLONS: 12.5
   PRICE/GAL: $3.65
   TOTAL: $45.67
   10/15/2025 2:30 PM',
  87.50,
  45.67,
  'SHELL STATION',
  '2025-10-15 00:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Expense 2: Supplies - OCR with high confidence
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  job_id,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor,
  ocr_date
) VALUES (
  'expense-demo-supplies-001',
  'supplies',
  127.50,
  'Inspection equipment supplies - Home Depot',
  '2025-10-22 10:15:00',
  true,
  (SELECT id FROM jobs LIMIT 1 OFFSET 1),  -- Link to second job (if exists)
  'https://storage.googleapis.com/demo-bucket/receipts/homedepot-001.jpg',
  'THE HOME DEPOT
   STORE #1234
   
   MARKING TAPE      $12.99
   CLIPBOARDS (3)    $24.97
   MEASURING TAPE    $19.99
   FLASHLIGHT        $34.99
   BATTERIES         $15.99
   GLOVES            $9.99
   MISC SUPPLIES     $8.58
   
   SUBTOTAL         $127.50
   TAX              $0.00
   TOTAL           $127.50
   
   10/22/2025 10:15 AM',
  92.30,
  127.50,
  'THE HOME DEPOT',
  '2025-10-22 00:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Expense 3: Equipment - Major purchase
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor
) VALUES (
  'expense-demo-equipment-001',
  'equipment',
  1250.00,
  'Replacement blower door fan motor',
  '2025-10-05 13:00:00',
  true,
  'https://storage.googleapis.com/demo-bucket/receipts/equipment-001.jpg',
  'ENERGY CONSERVATORY
   Invoice #INV-2025-1234
   
   Blower Door Fan Motor
   Model: DG-700
   Serial: BD123456
   
   TOTAL: $1,250.00
   
   Date: 10/05/2025',
  78.90,
  1250.00,
  'ENERGY CONSERVATORY'
) ON CONFLICT (id) DO NOTHING;

-- Expense 4: Meals - Partially deductible (50%)
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor,
  ocr_date
) VALUES (
  'expense-demo-meals-001',
  'meals',
  67.89,
  'Client lunch meeting - Olive Garden',
  '2025-10-18 12:30:00',
  true,
  'https://storage.googleapis.com/demo-bucket/receipts/olivegarden-001.jpg',
  'OLIVE GARDEN
   Server: Sarah
   Table: 15
   
   2x Lunch Special  $22.00
   1x Pasta Bowl     $15.99
   2x Beverages      $5.90
   1x Dessert        $7.99
   
   Subtotal         $51.88
   Tax              $4.15
   Tip             $11.86
   
   TOTAL           $67.89
   
   10/18/2025 12:30 PM
   Thank you!',
  85.60,
  67.89,
  'OLIVE GARDEN',
  '2025-10-18 00:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Expense 5: Software - Monthly subscription
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  receipt_url
) VALUES (
  'expense-demo-software-001',
  'software',
  29.99,
  'REsmart Pro monthly subscription',
  '2025-10-01 00:00:00',
  true,
  'https://storage.googleapis.com/demo-bucket/receipts/resmart-001.pdf'
) ON CONFLICT (id) DO NOTHING;

-- Expense 6: Vehicle Maintenance
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor,
  ocr_date
) VALUES (
  'expense-demo-vehicle-001',
  'vehicle',
  89.95,
  'Oil change and tire rotation',
  '2025-10-12 16:00:00',
  true,
  'https://storage.googleapis.com/demo-bucket/receipts/jiffy-001.jpg',
  'JIFFY LUBE
   Service Date: 10/12/2025
   
   Oil Change (Synthetic)  $65.95
   Tire Rotation          $24.00
   
   TOTAL                  $89.95
   
   Next Service: 01/12/2026
   or 3,000 miles',
  91.20,
  89.95,
  'JIFFY LUBE',
  '2025-10-12 00:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Expense 7: Office Supplies
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor
) VALUES (
  'expense-demo-office-001',
  'office',
  42.35,
  'Printer paper and ink cartridges - Staples',
  '2025-10-20 11:00:00',
  true,
  'https://storage.googleapis.com/demo-bucket/receipts/staples-001.jpg',
  'STAPLES
   Store #5678
   
   HP Ink Cartridge   $32.99
   Copy Paper (Ream)   $9.36
   
   TOTAL             $42.35
   
   Rewards Points: +42',
  88.70,
  42.35,
  'STAPLES'
) ON CONFLICT (id) DO NOTHING;

-- Expense 8: Tools - Small purchase
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible
) VALUES (
  'expense-demo-tools-001',
  'tools',
  15.99,
  'Replacement screwdriver set - Harbor Freight',
  '2025-10-25 09:30:00',
  true
) ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Sample Expenses for September 2025 (Previous Month)
-- ================================================================

-- Expense 9: Fuel - Previous month
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible
) VALUES (
  'expense-demo-fuel-002',
  'fuel',
  52.30,
  'Gas for job site travel',
  '2025-09-15 08:00:00',
  true
) ON CONFLICT (id) DO NOTHING;

-- Expense 10: Supplies - Previous month
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible
) VALUES (
  'expense-demo-supplies-002',
  'supplies',
  78.50,
  'Inspection forms and clipboards',
  '2025-09-22 14:00:00',
  true
) ON CONFLICT (id) DO NOTHING;

-- Expense 11: Lodging - Out of town job
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible,
  receipt_url,
  ocr_text,
  ocr_confidence,
  ocr_amount,
  ocr_vendor,
  ocr_date
) VALUES (
  'expense-demo-lodging-001',
  'lodging',
  145.00,
  'Hotel for out-of-town inspection - Hampton Inn',
  '2025-09-10 00:00:00',
  true,
  'https://storage.googleapis.com/demo-bucket/receipts/hampton-001.pdf',
  'HAMPTON INN
   Confirmation: ABC123456
   
   Check-in:  09/10/2025
   Check-out: 09/11/2025
   
   Room Rate (1 night)  $130.00
   Taxes               $15.00
   
   TOTAL              $145.00',
  82.40,
  145.00,
  'HAMPTON INN',
  '2025-09-10 00:00:00'
) ON CONFLICT (id) DO NOTHING;

-- Expense 12: Insurance - Quarterly payment
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible
) VALUES (
  'expense-demo-insurance-001',
  'insurance',
  450.00,
  'Professional liability insurance - Q3 2025',
  '2025-09-01 00:00:00',
  true
) ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Personal (Non-Deductible) Expense - For Testing
-- ================================================================

-- Expense 13: Personal meal (not deductible)
INSERT INTO expenses (
  id,
  category,
  amount,
  description,
  date,
  is_deductible
) VALUES (
  'expense-demo-personal-001',
  'meals',
  35.00,
  'Personal lunch (not business-related)',
  '2025-10-28 12:00:00',
  false
) ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Verification Queries
-- ================================================================

-- Show summary of seeded expenses
SELECT 
  category,
  COUNT(*) as count,
  SUM(amount::numeric) as total_amount,
  SUM(CASE WHEN is_deductible THEN amount::numeric ELSE 0 END) as deductible_amount
FROM expenses
WHERE id LIKE 'expense-demo-%'
GROUP BY category
ORDER BY category;

-- Show monthly breakdown
SELECT 
  TO_CHAR(date, 'YYYY-MM') as month,
  COUNT(*) as count,
  SUM(amount::numeric) as total
FROM expenses
WHERE id LIKE 'expense-demo-%'
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month DESC;

-- Show expenses with OCR data
SELECT 
  id,
  category,
  amount,
  ocr_vendor,
  ocr_confidence,
  CASE 
    WHEN ocr_confidence >= 90 THEN 'Excellent'
    WHEN ocr_confidence >= 80 THEN 'Good'
    WHEN ocr_confidence >= 70 THEN 'Fair'
    ELSE 'Poor'
  END as ocr_quality
FROM expenses
WHERE id LIKE 'expense-demo-%'
  AND ocr_text IS NOT NULL
ORDER BY ocr_confidence DESC;

COMMIT;

-- ================================================================
-- Post-Seed Instructions
-- ================================================================

-- To verify the seed data was inserted:
-- psql $DATABASE_URL -c "SELECT COUNT(*) FROM expenses WHERE id LIKE 'expense-demo-%';"
-- Expected: 13 rows

-- To view seeded expenses in the app:
-- 1. Start the server: npm run dev
-- 2. Navigate to: http://localhost:5000/expenses
-- 3. You should see 8 expenses for October 2025
-- 4. Use month filter to view September 2025 expenses (5 more)

-- To test monthly stats:
-- curl http://localhost:5000/api/expenses-by-category?month=2025-10

-- To clean up seed data (if needed):
-- psql $DATABASE_URL -c "DELETE FROM expenses WHERE id LIKE 'expense-demo-%';"
