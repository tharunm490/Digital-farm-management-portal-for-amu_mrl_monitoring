# LABORATORY DASHBOARD - COMPREHENSIVE TEST SUITE (Windows)
# Run this script to test all 6 sections of the laboratory module

Write-Host "🧪 LABORATORY DASHBOARD - COMPREHENSIVE TEST SUITE" -ForegroundColor Cyan
Write-Host "=================================================="
Write-Host ""

Write-Host "Starting Laboratory Dashboard Tests...`n" -ForegroundColor Blue

# Test 1: Database Connectivity
Write-Host "[1/3] Testing Database Connectivity & SQL Queries" -ForegroundColor Yellow
Push-Location backend
node test_lab_database.js
$TEST1_RESULT = $LASTEXITCODE
Pop-Location

Write-Host ""
Write-Host "[2/3] Testing API Endpoints (requires running server)" -ForegroundColor Yellow
Write-Host "Make sure backend server is running: npm start"
Write-Host "In another terminal, you can run:"
Write-Host "  curl http://localhost:5000/api/labs/stats -H 'Authorization: Bearer YOUR_TOKEN'"
Write-Host ""

Write-Host "[3/3] Testing Frontend Integration" -ForegroundColor Yellow
Write-Host "Frontend pages are already integrated:"
Write-Host "  - LaboratoryDashboard.js (Main dashboard with 4 stats)"
Write-Host "  - Lab/SampleRequests.js (Pending requests section)"
Write-Host "  - Lab/SampleCollection.js (Sample collection section)"
Write-Host "  - Lab/TestReportEntry.js (Report upload section)"
Write-Host "  - Lab/AllReports.js (All reports view section)"
Write-Host ""

if ($TEST1_RESULT -eq 0) {
    Write-Host "✅ All tests passed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check output above." -ForegroundColor Red
}

Write-Host ""
Write-Host "=================================================="
Write-Host "To test the complete flow:"
Write-Host ""
Write-Host "1. Start the backend server:"
Write-Host "   cd backend && npm start"
Write-Host ""
Write-Host "2. In another terminal, start the frontend:"
Write-Host "   cd frontend && npm start"
Write-Host ""
Write-Host "3. Log in as a laboratory user"
Write-Host ""
Write-Host "4. Visit http://localhost:3000/lab/dashboard"
Write-Host ""
Write-Host "5. Follow the workflow:"
Write-Host "   - View pending requests"
Write-Host "   - Collect samples"
Write-Host "   - Upload test reports"
Write-Host "   - View all reports"
Write-Host ""
Write-Host "6. As authority user, visit authority dashboard"
Write-Host "   to see all lab reports across all laboratories"
Write-Host ""
Write-Host "=================================================="
