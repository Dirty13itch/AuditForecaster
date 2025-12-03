# Gap Analysis: Test Coverage vs. Application Routes

## Covered Routes
- [x] `/dashboard` (Smoke Test)
- [x] `/dashboard/inspections/[id]/run` (Inspection Runner Test)
- [x] `/dashboard/finances` (Financials Test)
- [x] `/dashboard/finances/invoices` (Financials Test)
- [x] `/dashboard/finances/payouts` (Financials Test)
- [x] `/dashboard/logistics` (Logistics Test)
- [x] `/dashboard/assets/fleet` (Logistics Test)
- [x] `/dashboard/assets/equipment` (Logistics Test)

## Potential Gaps (To Be Verified)
- [ ] `/dashboard/admin`
    - [ ] User Management
    - [ ] System Logs
- [ ] `/dashboard/analytics`
    - [ ] Advanced Analytics
    - [ ] Inspector Performance
- [ ] `/dashboard/builder`
    - [ ] Builder List
    - [ ] Builder Details
- [ ] `/dashboard/jobs`
    - [ ] Job List
    - [ ] Job Details
    - [ ] Create/Edit Job
- [ ] `/dashboard/reports`
    - [ ] Report Templates
    - [ ] Generated Reports
- [ ] `/dashboard/settings`
    - [ ] Profile
    - [ ] Application Settings
- [ ] `/dashboard/team`
    - [ ] Inspector List
    - [ ] Inspector Details
- [ ] `/dashboard/diagnostics` (Mentioned in task.md)

## Action Plan
1.  Create `e2e/comprehensive-audit.spec.ts`.
2.  Add tests for each identified gap.
3.  Ensure seed data supports these tests.
4.  Run the full suite.
