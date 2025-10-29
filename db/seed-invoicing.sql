-- Financial/Invoicing System - Seed Data
-- Purpose: Realistic invoices, payments, aging scenarios
-- Scenarios: 10 test cases covering invoice lifecycle, partial payments, aging

-- ==============================================
-- SCENARIO 1: Draft Invoice (Not Yet Sent)
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, notes, created_at)
VALUES
  ('inv-001', 'INV-1000', 'job-001', 'user-001', 350.00, 26.25, 376.25, 'draft',
   NOW(), NOW() + INTERVAL '30 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Final Inspection', 'quantity', 1, 'rate', 350.00, 'amount', 350.00)
   ),
   'Net 30', 'Draft invoice awaiting review', NOW() - INTERVAL '1 day');

-- ==============================================
-- SCENARIO 2: Sent Invoice (Awaiting Payment)
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, created_at)
VALUES
  ('inv-002', 'INV-1001', 'job-002', 'user-001', 450.00, 33.75, 483.75, 'sent',
   NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Blower Door Test', 'quantity', 1, 'rate', 450.00, 'amount', 450.00)
   ),
   'Net 30', NOW() - INTERVAL '15 days');

-- ==============================================
-- SCENARIO 3: Paid Invoice (Full Payment)
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, paid_date, payment_method, payment_reference, items, terms, created_at)
VALUES
  ('inv-003', 'INV-1002', 'job-003', 'user-001', 275.00, 20.63, 295.63, 'paid',
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days',
   'check', 'CHK-54321',
   jsonb_build_array(
     jsonb_build_object('description', 'Pre-Drywall Inspection', 'quantity', 1, 'rate', 275.00, 'amount', 275.00)
   ),
   'Net 30', NOW() - INTERVAL '45 days');

INSERT INTO payments (id, invoice_id, amount, payment_date, method, reference, created_at)
VALUES
  ('pay-001', 'inv-003', 295.63, NOW() - INTERVAL '10 days', 'check', 'CHK-54321', NOW() - INTERVAL '10 days');

-- ==============================================
-- SCENARIO 4: Overdue Invoice (30 Days Past Due)
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, notes, created_at)
VALUES
  ('inv-004', 'INV-1003', 'job-004', 'user-001', 400.00, 30.00, 430.00, 'overdue',
   NOW() - INTERVAL '65 days', NOW() - INTERVAL '35 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Duct Leakage Test', 'quantity', 1, 'rate', 400.00, 'amount', 400.00)
   ),
   'Net 30', 'Overdue - sent reminder on ' || TO_CHAR(NOW() - INTERVAL '7 days', 'YYYY-MM-DD'),
   NOW() - INTERVAL '65 days');

-- ==============================================
-- SCENARIO 5: Partial Payment Invoice
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, created_at)
VALUES
  ('inv-005', 'INV-1004', 'job-005', 'user-001', 500.00, 37.50, 537.50, 'sent',
   NOW() - INTERVAL '20 days', NOW() + INTERVAL '10 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Energy Audit', 'quantity', 1, 'rate', 500.00, 'amount', 500.00)
   ),
   'Net 30', NOW() - INTERVAL '20 days');

INSERT INTO payments (id, invoice_id, amount, payment_date, method, reference, notes, created_at)
VALUES
  ('pay-002', 'inv-005', 200.00, NOW() - INTERVAL '5 days', 'check', 'CHK-11111', 'Partial payment 1 of 3', NOW() - INTERVAL '5 days'),
  ('pay-003', 'inv-005', 150.00, NOW() - INTERVAL '2 days', 'check', 'CHK-22222', 'Partial payment 2 of 3', NOW() - INTERVAL '2 days');

-- Remaining balance: $187.50

-- ==============================================
-- SCENARIO 6: Multi-Line Item Invoice
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, created_at)
VALUES
  ('inv-006', 'INV-1005', 'job-001', 'user-001', 675.00, 50.63, 725.63, 'sent',
   NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Final Inspection', 'quantity', 1, 'rate', 350.00, 'amount', 350.00),
     jsonb_build_object('description', 'Blower Door Test', 'quantity', 1, 'rate', 200.00, 'amount', 200.00),
     jsonb_build_object('description', 'Report Generation', 'quantity', 1, 'rate', 125.00, 'amount', 125.00)
   ),
   'Net 30', NOW() - INTERVAL '10 days');

-- ==============================================
-- SCENARIO 7: Cancelled Invoice
-- ==============================================
INSERT INTO invoices (id, invoice_number, user_id, amount, tax, total, status, issue_date, due_date, items, terms, notes, created_at)
VALUES
  ('inv-007', 'INV-1006', 'user-001', 300.00, 22.50, 322.50, 'cancelled',
   NOW() - INTERVAL '3 days', NOW() + INTERVAL '27 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Inspection (Cancelled by Client)', 'quantity', 1, 'rate', 300.00, 'amount', 300.00)
   ),
   'Net 30', 'Cancelled - client rescheduled for next month', NOW() - INTERVAL '3 days');

-- ==============================================
-- SCENARIO 8: Invoice with Builder Link
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, builder_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, created_at)
VALUES
  ('inv-008', 'INV-1007', 'job-002', 'builder-001', 'user-001', 425.00, 31.88, 456.88, 'sent',
   NOW() - INTERVAL '12 days', NOW() + INTERVAL '18 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Final Inspection - Lot 42', 'quantity', 1, 'rate', 425.00, 'amount', 425.00)
   ),
   'Net 30', NOW() - INTERVAL '12 days');

-- ==============================================
-- SCENARIO 9: Old Overdue Invoice (90+ Days)
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, items, terms, notes, created_at)
VALUES
  ('inv-009', 'INV-1008', 'job-003', 'user-001', 350.00, 26.25, 376.25, 'overdue',
   NOW() - INTERVAL '125 days', NOW() - INTERVAL '95 days',
   jsonb_build_array(
     jsonb_build_object('description', 'Pre-Insulation Inspection', 'quantity', 1, 'rate', 350.00, 'amount', 350.00)
   ),
   'Net 30', 'Severely overdue - escalated to collections', NOW() - INTERVAL '125 days');

-- ==============================================
-- SCENARIO 10: ACH Payment Invoice
-- ==============================================
INSERT INTO invoices (id, invoice_number, job_id, user_id, amount, tax, total, status, issue_date, due_date, paid_date, payment_method, payment_reference, items, terms, created_at)
VALUES
  ('inv-010', 'INV-1009', 'job-004', 'user-001', 380.00, 28.50, 408.50, 'paid',
   NOW() - INTERVAL '30 days', NOW(), NOW() - INTERVAL '2 days',
   'ach', 'ACH-TXN-9876543',
   jsonb_build_array(
     jsonb_build_object('description', 'Energy Audit - Residential', 'quantity', 1, 'rate', 380.00, 'amount', 380.00)
   ),
   'Net 30', NOW() - INTERVAL '30 days');

INSERT INTO payments (id, invoice_id, amount, payment_date, method, reference, created_at)
VALUES
  ('pay-004', 'inv-010', 408.50, NOW() - INTERVAL '2 days', 'ach', 'ACH-TXN-9876543', NOW() - INTERVAL '2 days');

-- ==============================================
-- Financial Settings for User
-- ==============================================
INSERT INTO financial_settings (id, user_id, tax_rate, invoice_prefix, next_invoice_number, payment_terms_days, invoice_footer_text, company_details, created_at, updated_at)
VALUES
  ('fin-settings-001', 'user-001', 7.50, 'INV', 1010, 30,
   'Thank you for your business! Payment due within 30 days.',
   jsonb_build_object(
     'name', 'Ulrich Energy Auditing',
     'address', '123 Main Street, Minneapolis, MN 55401',
     'phone', '(612) 555-1234',
     'email', 'billing@ulrichauditing.com',
     'taxId', '12-3456789'
   ),
   NOW() - INTERVAL '90 days', NOW() - INTERVAL '1 day');

-- ==============================================
-- SUMMARY QUERIES FOR VALIDATION
-- ==============================================

-- Verify invoices created
SELECT 
  'Invoices' as entity,
  COUNT(*) as total_invoices,
  COUNT(*) FILTER (WHERE status = 'draft') as draft,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'paid') as paid,
  COUNT(*) FILTER (WHERE status = 'overdue') as overdue,
  COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
  SUM(total) as total_invoiced,
  SUM(total) FILTER (WHERE status = 'paid') as total_paid
FROM invoices
WHERE id LIKE 'inv-%';

-- Verify payments created
SELECT 
  'Payments' as entity,
  COUNT(*) as total_payments,
  SUM(amount) as total_payment_amount
FROM payments
WHERE id LIKE 'pay-%';

-- AR Aging Report
SELECT 
  CASE 
    WHEN due_date >= CURRENT_DATE THEN 'Current'
    WHEN due_date >= CURRENT_DATE - INTERVAL '30 days' THEN '1-30 Days'
    WHEN due_date >= CURRENT_DATE - INTERVAL '60 days' THEN '31-60 Days'
    WHEN due_date >= CURRENT_DATE - INTERVAL '90 days' THEN '61-90 Days'
    ELSE '90+ Days'
  END as aging_bucket,
  COUNT(*) as invoice_count,
  SUM(total) as total_amount
FROM invoices
WHERE id LIKE 'inv-%' AND status IN ('sent', 'overdue')
GROUP BY aging_bucket
ORDER BY 
  CASE aging_bucket
    WHEN 'Current' THEN 1
    WHEN '1-30 Days' THEN 2
    WHEN '31-60 Days' THEN 3
    WHEN '61-90 Days' THEN 4
    ELSE 5
  END;

-- Invoice Payment Status
SELECT 
  i.invoice_number,
  i.status,
  i.total as invoice_total,
  COALESCE(SUM(p.amount), 0) as total_payments,
  i.total - COALESCE(SUM(p.amount), 0) as amount_due
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE i.id LIKE 'inv-%'
GROUP BY i.id, i.invoice_number, i.status, i.total
ORDER BY i.created_at DESC;

-- Financial Summary by Month
SELECT 
  DATE_TRUNC('month', issue_date) as month,
  COUNT(*) as invoice_count,
  SUM(total) as total_invoiced,
  SUM(total) FILTER (WHERE status = 'paid') as total_paid,
  COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
  SUM(total) FILTER (WHERE status IN ('sent', 'overdue')) as outstanding
FROM invoices
WHERE id LIKE 'inv-%'
GROUP BY DATE_TRUNC('month', issue_date)
ORDER BY month DESC;

-- Payment Methods Summary
SELECT 
  method,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount
FROM payments
WHERE id LIKE 'pay-%'
GROUP BY method
ORDER BY total_amount DESC;
