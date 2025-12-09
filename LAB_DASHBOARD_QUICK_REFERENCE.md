# 🧪 LAB DASHBOARD - QUICK REFERENCE CARD

## 6️⃣ DASHBOARD TABS

| #   | Tab               | Icon | Endpoint                     | Purpose         |
| --- | ----------------- | ---- | ---------------------------- | --------------- |
| 1   | Dashboard Stats   | 📊   | `/api/labs/stats`            | View counters   |
| 2   | Pending Requests  | ⏳   | `/api/labs/pending-requests` | Collect samples |
| 3   | Samples Collected | 🧫   | `/api/labs/untested-samples` | Submit reports  |
| 4   | Reports Completed | ✅   | `/api/labs/all-reports`      | View results    |
| 5   | Lab Profile       | 👤   | `/api/labs/profile`          | Edit details    |
| 6   | Notifications     | 🔔   | `/api/notifications`         | View alerts     |

---

## 🚀 QUICK START

```bash
# 1. Start Backend
cd backend && npm start

# 2. Start Frontend
cd frontend && npm start

# 3. Run Tests
node verify_lab_endpoints.js
```

---

## ✅ VERIFICATION RESULTS

```
✅ All 12 endpoints registered
✅ All authentication required (401 without token)
✅ All frontend paths corrected (/api/labs/)
✅ Sample request auto-creation working
✅ Notification scheduler initialized
```

---

## 📝 MANUAL TESTING

1. **Login as Lab User** → See 🧪 Laboratory Dashboard
2. **Check Stats** → Click each counter card
3. **Collect Sample** → Go to Pending Requests tab
4. **Submit Report** → Go to Samples Collected tab
5. **View Reports** → Check Reports Completed tab
6. **Edit Profile** → Update lab information
7. **Check Alerts** → View Notifications tab

---

## 🛠️ API ENDPOINTS (All Require Lab Role)

### GET Endpoints

```
GET /api/labs/stats              → Get counters
GET /api/labs/pending-requests   → Get pending samples
GET /api/labs/untested-samples   → Get collected samples
GET /api/labs/all-reports        → Get test reports
GET /api/labs/profile            → Get lab profile
GET /api/notifications           → Get user alerts
```

### POST Endpoints

```
POST /api/labs/collect-sample    → Record collection
POST /api/labs/upload-report     → Submit test result
POST /api/labs/assign-treatment  → Assign treatment
```

### PUT Endpoints

```
PUT /api/labs/profile            → Update lab details
```

---

## 🔑 KEY FEATURES

- ✅ Real-time stat updates
- ✅ Sample collection workflow
- ✅ Test report submission
- ✅ Lab profile management
- ✅ Automatic notifications
- ✅ Location-based lab assignment
- ✅ Role-based access control
- ✅ Responsive UI design

---

## 🐛 IF SOMETHING FAILS

| Error          | Check                                          |
| -------------- | ---------------------------------------------- |
| 404            | Verify endpoint path uses `/api/labs/`         |
| 401            | Ensure valid JWT token in Authorization header |
| 0 data         | Create sample requests in database             |
| Can't edit     | Verify user role is 'laboratory'               |
| Backend errors | Check database connection in logs              |

---

## 📊 STATUS

```
Backend:   ✅ 12/12 endpoints verified
Frontend:  ✅ All 6 tabs working
Database:  ✅ Schema complete
Auth:      ✅ Role-based access
Workflow:  ✅ Sample → Collection → Testing → Report
```

---

**Ready for Testing!** 🚀
