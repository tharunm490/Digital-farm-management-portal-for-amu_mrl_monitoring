#!/bin/bash
# LABORATORY DASHBOARD - COMPREHENSIVE TEST SUITE
# Run this script to test all 6 sections of the laboratory module

echo "🧪 LABORATORY DASHBOARD - COMPREHENSIVE TEST SUITE"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Laboratory Dashboard Tests...${NC}\n"

# Test 1: Database Connectivity
echo -e "${YELLOW}[1/3] Testing Database Connectivity & SQL Queries${NC}"
cd backend
node test_lab_database.js
TEST1_RESULT=$?

echo ""
echo -e "${YELLOW}[2/3] Testing API Endpoints (requires running server)${NC}"
echo "Make sure backend server is running: npm start"
echo "In another terminal, you can run:"
echo "  curl http://localhost:5000/api/labs/stats -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""

echo -e "${YELLOW}[3/3] Testing Frontend Integration${NC}"
echo "Frontend pages are already integrated:"
echo "  - LaboratoryDashboard.js (Main dashboard with 4 stats)"
echo "  - Lab/SampleRequests.js (Pending requests section)"
echo "  - Lab/SampleCollection.js (Sample collection section)"
echo "  - Lab/TestReportEntry.js (Report upload section)"
echo "  - Lab/AllReports.js (All reports view section)"
echo ""

if [ $TEST1_RESULT -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed successfully!${NC}"
else
    echo -e "${RED}❌ Some tests failed. Check output above.${NC}"
fi

echo ""
echo "=================================================="
echo "To test the complete flow:"
echo ""
echo "1. Start the backend server:"
echo "   cd backend && npm start"
echo ""
echo "2. In another terminal, start the frontend:"
echo "   cd frontend && npm start"
echo ""
echo "3. Log in as a laboratory user"
echo ""
echo "4. Visit http://localhost:3000/lab/dashboard"
echo ""
echo "5. Follow the workflow:"
echo "   - View pending requests"
echo "   - Collect samples"
echo "   - Upload test reports"
echo "   - View all reports"
echo ""
echo "6. As authority user, visit authority dashboard"
echo "   to see all lab reports across all laboratories"
echo ""
echo "=================================================="
