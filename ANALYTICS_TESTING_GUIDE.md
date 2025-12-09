# 🚀 Quick Start Guide - Analytics Dashboard Testing

## Prerequisites

- Backend server running on Railway or localhost:5000
- Frontend server running on localhost:3000
- Authority user account (role: 'authority')
- Sample data in database (amu_records, lab_reports, farms)

---

## Step 1: Test Backend Analytics Endpoints

### Option A: Using the Test Script

```powershell
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\backend
node test_analytics.js
```

**Expected Output:**

```
🧪 Testing Analytics Dashboard Queries...

📊 Test 1: Overview Stats
✅ Overview: { total_amu: 150, total_farms: 45, total_reports: 89, unsafe_reports: 12, pending_samples: 8 }

💊 Test 2: Antibiotic Category Usage
✅ Found 6 categories: [...]

🐄 Test 3: Species Usage
✅ Found 5 species: [...]

... (continues for all 10 tests)

✅ All Analytics Tests Passed!
🎉 Analytics Dashboard is ready for deployment!
```

### Option B: Using cURL/Postman

```bash
# Get auth token first (login as authority user)
# Then test endpoints:

# 1. Overview
curl http://localhost:5000/api/analytics/overview -H "Authorization: Bearer YOUR_TOKEN"

# 2. Category Usage
curl http://localhost:5000/api/analytics/category-usage -H "Authorization: Bearer YOUR_TOKEN"

# 3. State Heatmap
curl http://localhost:5000/api/analytics/state-usage -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Step 2: Start Application Servers

### Terminal 1 - Backend

```powershell
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\backend
npm start
```

**Expected:**

```
Server running on port 5000
Database connected successfully
```

### Terminal 2 - Frontend

```powershell
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\frontend
npm start
```

**Expected:**

```
Compiled successfully!
You can now view frontend in the browser.
Local: http://localhost:3000
```

---

## Step 3: Login as Authority User

1. **Open Browser:** `http://localhost:3000`
2. **Navigate to Login:** Click "Login" button
3. **Enter Credentials:**
   - Email: authority@example.com (or your authority user email)
   - Password: your_password
4. **Verify Role:** After login, check that you're on `/authority/dashboard`

---

## Step 4: Navigate to Analytics Dashboard

### Method 1: Direct URL

```
http://localhost:3000/authority/analytics-dashboard
```

### Method 2: From Navigation Menu

1. Click on the navigation menu (hamburger icon or sidebar)
2. Look for "Analytics Dashboard" or similar link
3. Click to navigate

**Expected Result:**

- Page loads with title: "📊 Comprehensive AMU Analytics Dashboard"
- 5 stat cards visible (AMU Records, Farms, Lab Reports, Unsafe, Pending)
- 4 charts rendered (Bar, Pie, Line, Doughnut)
- Automated insights section with colored alerts
- 3 navigation cards at bottom (Analytics Dashboard, State Heat Map, Risky Farms)

---

## Step 5: Test State Heatmap

1. **Click "State Heat Map" card** (red gradient with 🗺️ icon)
2. **Verify Page Load:**
   - Title: "🗺️ AMU State Heat Map"
   - Color legend (Green → Yellow → Orange → Red)
   - List of states with usage bars
   - Empty "District Breakdown" sidebar
3. **Test Drill-Down:**
   - Click on any state card
   - Verify districts appear in right sidebar
   - Check that state card is highlighted (blue border)
   - Verify district usage bars render correctly
4. **Click Another State:**
   - Confirm districts update dynamically
   - Check that previous state is deselected

---

## Step 6: Test Withdrawal Compliance

1. **Navigate back** (← Back to Analytics button)
2. **Click "Withdrawal Compliance"** from main dashboard or direct URL:
   ```
   http://localhost:3000/authority/analytics/withdrawal-compliance
   ```
3. **Verify Page Load:**
   - Title: "✅ Withdrawal Period Compliance"
   - Circular gauge with percentage
   - Grade badge (A/B/C/D) with color
   - 3 stat cards (Compliant, Non-Compliant, Total)
   - Educational sections (What is Withdrawal Period?, Compliance Criteria)
   - Recommendations based on compliance level
4. **Check Calculations:**
   - Verify compliance_rate = (compliant_count / total_treatments) \* 100
   - Confirm gauge color matches grade (Green A, Yellow B, Red D)
   - Check that recommendation message matches grade

---

## Step 7: Test Risky Farms Analysis

1. **Navigate to Risky Farms:**
   ```
   http://localhost:3000/authority/analytics/risky-farms
   ```
2. **Verify Page Load:**
   - Title: "🚨 High-Risk Farms Analysis"
   - 4 summary cards (Total, Critical, High, Moderate)
   - Sorting buttons (Unsafe Reports Count, Max Residue Level)
   - Farms table with columns (Rank, Farm Details, Location, Unsafe Reports, Max Residue, Severity, Actions)
   - Action recommendations section
3. **Test Sorting:**
   - Click "🔢 Unsafe Reports Count" button
   - Verify table re-orders by unsafe_count DESC
   - Click "⚗️ Max Residue Level" button
   - Verify table re-orders by max_residue DESC
4. **Check Severity Badges:**
   - Critical (Red): unsafe_count ≥ 10
   - High (Orange): unsafe_count 5-9
   - Moderate (Yellow): unsafe_count 3-4
   - Low (Blue): unsafe_count < 3

---

## Step 8: Verify Chart Functionality

### On Main Analytics Dashboard:

1. **Bar Chart (Category Usage):**

   - Hover over bars
   - Verify tooltip shows category name and count
   - Check that all categories are color-coded

2. **Pie Chart (Species Usage):**

   - Hover over slices
   - Verify tooltip shows species and percentage
   - Check legend displays all species

3. **Line Chart (Monthly Trends):**

   - Hover over data points
   - Verify tooltip shows month and AMU count
   - Check that line is smooth and continuous

4. **Doughnut Chart (Lab Reports):**
   - Hover over segments
   - Verify tooltip shows status (Safe/Borderline/Unsafe) and count
   - Check center displays total reports

---

## Step 9: Test Automated Insights

**On Main Analytics Dashboard:**

1. **Locate Insights Section:**

   - Below charts, before navigation cards
   - Title: "💡 Automated Insights"

2. **Verify Alerts:**

   - **Danger (Red):** Unsafe reports > 10 or Compliance < 70%
   - **Warning (Yellow):** Pending samples > 20
   - **Info (Blue):** General information

3. **Check Alert Messages:**
   - Each alert should have emoji, type badge, and descriptive message
   - Example: "🚨 ALERT: 15 unsafe lab reports detected. Immediate action required."

---

## Step 10: Test Navigation & Back Buttons

1. **From Main Dashboard:**

   - Click "State Heat Map" → Verify navigation works
   - Click "← Back to Analytics" → Return to main dashboard
   - Repeat for Compliance and Risky Farms pages

2. **Verify URL Changes:**

   - Main: `/authority/analytics-dashboard`
   - Heatmap: `/authority/analytics/state-heatmap`
   - Compliance: `/authority/analytics/withdrawal-compliance`
   - Risky Farms: `/authority/analytics/risky-farms`

3. **Browser Back/Forward:**
   - Use browser back button
   - Verify page state is preserved
   - Use forward button to return

---

## Common Issues & Troubleshooting

### Issue 1: Charts Not Rendering

**Symptoms:** Empty chart containers or console errors like "Cannot read property 'length' of undefined"

**Solutions:**

1. Check browser console for Chart.js registration errors
2. Verify data arrays are not empty: `console.log(categoryUsage, speciesUsage)`
3. Ensure Chart.js components are registered in AnalyticsDashboard.js:
   ```javascript
   ChartJS.register(
     CategoryScale,
     LinearScale,
     PointElement,
     LineElement,
     BarElement,
     ArcElement,
     Title,
     Tooltip,
     Legend
   );
   ```

### Issue 2: 401 Unauthorized

**Symptoms:** API calls fail with 401 status

**Solutions:**

1. Check localStorage: `localStorage.getItem('token')`
2. Re-login if token expired
3. Verify token is included in fetch headers:
   ```javascript
   headers: {
     Authorization: `Bearer ${token}`;
   }
   ```

### Issue 3: Empty Data Arrays

**Symptoms:** "No data available" or empty tables/charts

**Solutions:**

1. Run backend test script: `node test_analytics.js`
2. Check if sample data exists in database:
   ```sql
   SELECT COUNT(*) FROM amu_records;
   SELECT COUNT(*) FROM lab_reports;
   SELECT COUNT(*) FROM farms;
   ```
3. If empty, populate with test data (create sample data script)

### Issue 4: CORS Errors

**Symptoms:** "Access to fetch blocked by CORS policy"

**Solutions:**

1. Check backend CORS configuration in `server.js`:
   ```javascript
   app.use(
     cors({
       origin: "http://localhost:3000",
       credentials: true,
     })
   );
   ```
2. Restart backend server after changes

### Issue 5: Wrong User Role

**Symptoms:** 403 Forbidden or "Access Denied"

**Solutions:**

1. Verify user role in database:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'your_email@example.com';
   ```
2. Update role if needed:
   ```sql
   UPDATE users SET role = 'authority' WHERE id = YOUR_USER_ID;
   ```
3. Re-login to refresh JWT token

---

## Quick Verification Checklist

### Backend (5 min)

- [ ] `node test_analytics.js` passes all tests
- [ ] Backend server starts without errors
- [ ] Database connection successful
- [ ] Analytics routes registered in server.js

### Frontend (10 min)

- [ ] Frontend server starts without errors
- [ ] Login as authority user successful
- [ ] Main Analytics Dashboard loads with all charts
- [ ] State Heatmap loads and drill-down works
- [ ] Withdrawal Compliance gauge displays correctly
- [ ] Risky Farms table populates with data
- [ ] Sorting works on Risky Farms page
- [ ] Back navigation buttons work
- [ ] No console errors in browser DevTools

### Data Integrity (5 min)

- [ ] Overview stats match database counts
- [ ] Chart data is consistent across pages
- [ ] Compliance calculation is correct (compliant / total \* 100)
- [ ] Risky farms sorted correctly by unsafe_count
- [ ] State heatmap colors match usage intensity

---

## Success Criteria

✅ **Backend Test Script:** All 10 tests pass  
✅ **Main Dashboard:** All 4 charts render, 5 stats display, insights show  
✅ **State Heatmap:** States list, click state → districts appear  
✅ **Compliance Page:** Gauge shows rate, grade matches color, stats correct  
✅ **Risky Farms:** Table populates, sorting works, severity badges correct  
✅ **Navigation:** All back buttons work, URL routing correct  
✅ **No Errors:** Browser console clean, no 401/403/500 errors

---

## Next Steps After Testing

1. **If All Tests Pass:**

   - Deploy to production environment
   - Update navigation menu to include "Analytics Dashboard"
   - Share documentation with team
   - Schedule training session for authority users

2. **If Tests Fail:**
   - Review console errors in browser DevTools
   - Check backend logs for API errors
   - Verify database schema matches expectations
   - Consult troubleshooting section above
   - Re-run test script after fixes

---

## Support Commands

### Check Node/npm versions:

```powershell
node --version  # Should be v14+
npm --version   # Should be v6+
```

### Check installed packages:

```powershell
cd backend
npm list mysql2 express jsonwebtoken

cd ..\frontend
npm list react react-router-dom chart.js react-chartjs-2
```

### Restart servers:

```powershell
# Stop: Ctrl+C in each terminal
# Start backend:
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\backend; npm start

# Start frontend:
cd c:\Users\Raksha\OneDrive\Desktop\SIH2\frontend; npm start
```

---

**Estimated Testing Time:** 25-30 minutes  
**Difficulty Level:** Intermediate  
**Last Updated:** January 2025
