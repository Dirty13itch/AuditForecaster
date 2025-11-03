# M/I Homes Twin Cities Seed Data

## Overview
This seed script creates comprehensive test data for the M/I Homes - Twin Cities Division, following the AAA Blueprint specifications for the energy auditing field application.

## Execution

### Run the seed script:
```bash
# Using the helper script
./scripts/seed-mi-homes-aaa.sh

# Or directly with tsx
tsx server/seeds/index.ts --mi-homes
```

## Data Created

### Communities (5 Real M/I Homes Minnesota Locations)
1. **Rush Hollow North** (Maple Grove) - Single-family homes
2. **Valley Crest** (Shakopee) - Single-family + villas
3. **Oneka Shores** (Hugo) - Carriage + Hans Hagen Villa collections
4. **Amber Fields** (Rosemount) - Multiple enclaves: Annagaire, Artaine, Alder Glen
5. **Towns at Fox Creek** (Rogers) - Townhomes

### Builders (2)
- **M/I Homes - Twin Cities Division** - Primary builder
- **Ulrich Energy Auditing** - Third-party rater organization

### Home Plans (16)
- **Single-Family**: Alexander, Victoria, Birchwood II, Columbia, Hudson
- **Hans Hagen Villas**: Cedarwood, Grayson, Willow II
- **Townhomes**: Savanna, Camden
- Plus additional plans for variety

### Jobs (50)
- Distributed across all 5 communities
- Mix of Pre-Drywall (sv2) and Final (full_test) inspections
- Scheduled from March to May 2025
- Includes realistic Minnesota addresses with GPS coordinates

### Visits (15)
- Include comprehensive test data:
  - Blower Door Tests (CFM50, ACH50 values)
  - Duct Leakage Tests (DLO, TDL percentages)
  - Ventilation Tests (ERV, HRV systems)
- Pass/fail status based on code requirements
- Complete inspection notes

### Photos (18)
- Realistic filenames matching inspection context
- EXIF metadata including timestamps and GPS coordinates
- Various inspection photos (blower door, duct leakage, ERV systems)

### QA Items (5 Embedded Anomalies)
1. **DLO > TDL Error** - Measurement anomaly for dashboard testing
2. **Missing Damper Photo** - Documentation issue
3. **Leaky Boot Connection** - Equipment issue
4. **Blurry Photo** - Quality control issue
5. **ACH50 Code Violation** - Compliance issue

### 45L Tax Credits (5 Projects)
- Various statuses: Certified, Pending, Claimed
- Associated with specific jobs
- Different credit amounts ($2,000 - $5,000)
- Submission dates from February to May 2025

## Test Scenarios

The seed data includes several intentional anomalies for testing:

1. **Data Anomalies**: First 3 visits have DLO > TDL (should trigger QA alerts)
2. **Code Violations**: Some ACH50 values exceed Minnesota's 3.0 requirement
3. **Failed Tests**: Mix of passed and failed inspections for dashboard filtering
4. **Photo Quality**: Various photo scenarios for testing gallery features

## Idempotency

The script is designed to be idempotent:
- Checks for existing builders before creating
- Uses "upsert" logic for jobs
- Validates existing data before insertion
- Can be run multiple times safely

## Data Verification

After running the seed script, verify:
1. Jobs appear in the jobs dashboard
2. Communities are properly grouped
3. Test results display correctly
4. Photos are accessible in the gallery
5. QA anomalies trigger appropriate alerts
6. 45L tax credit data appears in financial reports

## Notes

- All addresses use approximate real Minnesota GPS coordinates
- Test data spans March-May 2025 for realistic scheduling
- Inspection values are based on Minnesota energy code requirements
- Photos are referenced but not actual files (application handles missing images gracefully)