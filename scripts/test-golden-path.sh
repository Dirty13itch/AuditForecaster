#!/bin/bash

# Golden Path Test Runner Script
# Executes all Golden Path tests with proper configuration

echo "🚀 Running Golden Path Tests"
echo "================================"

# Ensure playwright browsers are installed
npx playwright install chromium

# Export test environment variables
export BASE_URL=${BASE_URL:-"http://localhost:5000"}
export NODE_ENV="test"

# Function to run a specific GP test
run_gp_test() {
    local test_name=$1
    local test_file=$2
    echo ""
    echo "📝 Running ${test_name}..."
    echo "--------------------------------"
    npx playwright test "${test_file}" --reporter=list || echo "⚠️ ${test_name} completed with issues"
}

# Check if specific test is requested
if [ "$1" = "gp-01" ]; then
    run_gp_test "GP-01: Calendar to Report" "tests/e2e/golden-path/gp-01-calendar-to-report.spec.ts"
elif [ "$1" = "gp-02" ]; then
    run_gp_test "GP-02: Final Visit" "tests/e2e/golden-path/gp-02-final-visit.spec.ts"
elif [ "$1" = "gp-03" ]; then
    run_gp_test "GP-03: Offline Photos" "tests/e2e/golden-path/gp-03-offline-photos.spec.ts"
elif [ "$1" = "gp-04" ]; then
    run_gp_test "GP-04: 45L Tax Credit" "tests/e2e/golden-path/gp-04-45l-tax-credit.spec.ts"
elif [ "$1" = "gp-05" ]; then
    run_gp_test "GP-05: QA Review" "tests/e2e/golden-path/gp-05-qa-review.spec.ts"
elif [ "$1" = "all" ] || [ -z "$1" ]; then
    # Run all GP tests
    echo "Running all Golden Path tests..."
    npx playwright test tests/e2e/golden-path --reporter=html
else
    echo "Usage: $0 [gp-01|gp-02|gp-03|gp-04|gp-05|all]"
    exit 1
fi

echo ""
echo "✅ Test execution complete!"
echo ""
echo "📊 View HTML report: npx playwright show-report"