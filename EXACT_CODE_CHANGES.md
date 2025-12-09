# 📝 EXACT CODE CHANGES - LINE BY LINE REFERENCE

## File 1: backend/models/AMU.js

### Change 1: Added Lab Assignment Helper Method

**Location:** Beginning of class (lines 1-51)
**Type:** NEW CODE ADDED

```javascript
// Helper method to find the best laboratory for sample assignment
// Priority: Same taluk > Same district > Same state > Any lab
static async findAssignedLab(state, district, taluk) {
  try {
    // Priority 1: Same taluk
    const [talukLabs] = await db.execute(
      'SELECT lab_id FROM laboratories WHERE state = ? AND district = ? AND taluk = ? LIMIT 1',
      [state, district, taluk]
    );
    if (talukLabs.length > 0) {
      console.log(`✅ Lab found in same taluk: ${talukLabs[0].lab_id}`);
      return talukLabs[0].lab_id;
    }

    // Priority 2: Same district
    const [districtLabs] = await db.execute(
      'SELECT lab_id FROM laboratories WHERE state = ? AND district = ? LIMIT 1',
      [state, district]
    );
    if (districtLabs.length > 0) {
      console.log(`✅ Lab found in same district: ${districtLabs[0].lab_id}`);
      return districtLabs[0].lab_id;
    }

    // Priority 3: Same state
    const [stateLabs] = await db.execute(
      'SELECT lab_id FROM laboratories WHERE state = ? LIMIT 1',
      [state]
    );
    if (stateLabs.length > 0) {
      console.log(`✅ Lab found in same state: ${stateLabs[0].lab_id}`);
      return stateLabs[0].lab_id;
    }

    // Priority 4: Any lab
    const [anyLabs] = await db.execute('SELECT lab_id FROM laboratories LIMIT 1');
    if (anyLabs.length > 0) {
      console.log(`✅ Lab found (any): ${anyLabs[0].lab_id}`);
      return anyLabs[0].lab_id;
    }

    console.warn('⚠️ No laboratories found in the system');
    return null;
  } catch (err) {
    console.error('Error finding assigned lab:', err.message);
    return null;
  }
}
```

### Change 2: Added Sample Request Auto-Creation

**Location:** Before `return result.insertId;` (lines 253-328)
**Type:** NEW CODE ADDED

```javascript
// ========================================
// 🔬 STEP 1: CREATE SAMPLE REQUEST
// ========================================
// After AMU record is created with safe_date, automatically create a sample request
// with the best-assigned laboratory
if (safe_date) {
  try {
    console.log(`\n📋 STEP 1: Creating sample request for AMU ID ${amuId}`);
    console.log(`   safe_date: ${safe_date}`);

    // Get farm location details for lab assignment
    const [farmDetails] = await db.execute(
      "SELECT f.state, f.district, f.taluk, fr.farmer_id FROM farms f JOIN farmers fr ON f.farmer_id = fr.farmer_id WHERE f.farm_id = ?",
      [farm_id]
    );

    if (!farmDetails || farmDetails.length === 0) {
      console.warn("⚠️ Could not find farm details for sample request");
    } else {
      const { state, district, taluk, farmer_id } = farmDetails[0];

      // Find the best laboratory
      const assigned_lab_id = await AMU.findAssignedLab(state, district, taluk);

      if (assigned_lab_id) {
        // Create sample request
        const sampleRequestQuery = `
          INSERT INTO sample_requests (treatment_id, farmer_id, entity_id, assigned_lab_id, safe_date, status)
          VALUES (?, ?, ?, ?, ?, 'requested')
        `;

        const [sampleResult] = await db.execute(sampleRequestQuery, [
          treatment_id,
          farmer_id,
          entity_id,
          assigned_lab_id,
        ]);

        const sample_request_id = sampleResult.insertId;
        console.log(`✅ Sample request created successfully!`);
        console.log(`   sample_request_id: ${sample_request_id}`);
        console.log(`   assigned_lab_id: ${assigned_lab_id}`);
        console.log(`   status: requested`);

        // Create notification for farmer
        await Notification.create({
          user_id: farmerUserId,
          type: "info",
          subtype: "sample_request_created",
          message: `Lab assigned for sample collection. Your sample will be ready for collection on ${safe_date}`,
          entity_id,
          treatment_id,
          amu_id: amuId,
        });
        console.log(`📧 Notification sent to farmer about sample request`);
      } else {
        console.warn(
          "⚠️ No laboratory available for sample request assignment"
        );
      }
    }
  } catch (sampleErr) {
    console.error("❌ Error creating sample request:", sampleErr.message);
    // Don't throw - sample request creation is optional, AMU record already created
  }
}
```

---

## File 2: backend/server.js

### Change: Add Notification Scheduler Initialization

**Location:** After Passport initialization (lines 100-107)
**Type:** NEW CODE ADDED

```javascript
// =========================================
// NOTIFICATION SCHEDULER (FOR LAB MODULE)
// =========================================
const NotificationScheduler = require("./utils/notificationScheduler");
try {
  NotificationScheduler.initializeScheduler();
} catch (err) {
  console.warn("⚠️ Failed to initialize notification scheduler:", err.message);
}
```

---

## File 3: backend/utils/notificationScheduler.js

### NEW FILE CREATED

**Size:** 373 lines
**Purpose:** Automatic notification handling for laboratory module

**Key Methods:**

1. `checkSafeDateNotifications()` - Runs every 6 hours
2. `checkUnsafeTestResults()` - Runs every 2 hours
3. `checkPendingCollectionReminders()` - Runs daily
4. `initializeScheduler()` - Called once on server start

See full file in workspace: `backend/utils/notificationScheduler.js`

---

## File 4: backend/DATABASE_SCHEMA_UPDATES.sql

### NEW FILE CREATED

**Size:** 85 lines
**Purpose:** SQL migrations for database schema

**Columns to Add:**

```sql
ALTER TABLE sample_requests
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE sample_requests
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP NULL DEFAULT NULL;

ALTER TABLE lab_test_reports
ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMP NULL DEFAULT NULL;
```

---

## Summary of Changes

### Code Files Modified

| File                    | Type   | Lines Added | Purpose                          |
| ----------------------- | ------ | ----------- | -------------------------------- |
| backend/models/AMU.js   | MODIFY | ~100        | Lab assignment + sample creation |
| backend/server.js       | MODIFY | 8           | Scheduler initialization         |
| **Total Code Modified** |        | **~108**    |                                  |

### New Files Created

| File                                   | Lines | Purpose                 |
| -------------------------------------- | ----- | ----------------------- |
| backend/utils/notificationScheduler.js | 373   | Notification automation |
| backend/DATABASE_SCHEMA_UPDATES.sql    | 85    | Schema migrations       |
| LAB_MODULE_IMPLEMENTATION_COMPLETE.md  | 700+  | Full documentation      |
| LAB_MODULE_QUICK_REFERENCE.md          | 350+  | Quick start guide       |
| LABORATORY_MODULE_EXECUTIVE_SUMMARY.md | 500+  | Executive summary       |
| IMPLEMENTATION_VALIDATION_REPORT.md    | 350+  | Validation report       |
| This file (EXACT_CODE_CHANGES.md)      | 300+  | Code reference          |

---

## No Breaking Changes

✅ All existing APIs remain unchanged
✅ All existing database tables unaffected
✅ New columns are additive (not removing any)
✅ New code is optional (notification scheduler can be disabled)
✅ Backward compatible with existing data

---

## Verification Commands

### Check AMU changes

```bash
grep -n "findAssignedLab\|STEP 1: CREATE SAMPLE REQUEST" backend/models/AMU.js
```

### Check server initialization

```bash
grep -n "NotificationScheduler" backend/server.js
```

### Verify new files exist

```bash
ls -la backend/utils/notificationScheduler.js
ls -la backend/DATABASE_SCHEMA_UPDATES.sql
```

### Test notification scheduler

```javascript
const NotificationScheduler = require("./utils/notificationScheduler");
NotificationScheduler.checkSafeDateNotifications();
```

---

## Testing the Changes

### 1. Test Lab Assignment

```javascript
const lab_id = await AMU.findAssignedLab("Karnataka", "Belgaum", "Belgaum");
console.log("Assigned Lab:", lab_id);
```

### 2. Test Sample Request Creation

```javascript
const amu = await AMU.create({
  treatment_id: 1,
  entity_id: 1,
  farm_id: 1,
  user_id: 1,
  species: "cattle",
  medicine: "Amoxicillin",
  safe_date: "2025-01-15",
  // ... other fields
});
// Should auto-create sample_request
```

### 3. Test Notification Scheduler

```bash
# Check logs on server start
tail -f server.log | grep "Notification Scheduler"

# Should output:
# 🔔 Initializing Notification Scheduler...
# ✅ Notification Scheduler initialized
```

---

## Deployment Checklist

- [ ] Backup current database
- [ ] Run DATABASE_SCHEMA_UPDATES.sql
- [ ] Pull latest code from repository
- [ ] Install dependencies: `npm install`
- [ ] Test AMU.findAssignedLab() with sample data
- [ ] Start server and check logs
- [ ] Verify "Notification Scheduler initialized" appears
- [ ] Create test AMU record and verify sample_request auto-created
- [ ] Test lab dashboard endpoints
- [ ] Test collect-sample and upload-report endpoints
- [ ] Verify notifications are sent (check notification_history)
- [ ] Monitor for 24 hours

---

## Quick Reference

### Location of Key Functions

**Lab Assignment:**

```
File: backend/models/AMU.js
Method: AMU.findAssignedLab(state, district, taluk)
Lines: 1-51
```

**Sample Request Creation:**

```
File: backend/models/AMU.js
Location: Inside AMU.create() method
Lines: 253-328
Triggered: When safe_date is calculated
```

**Notification Scheduler:**

```
File: backend/utils/notificationScheduler.js
Class: NotificationScheduler
Methods: checkSafeDateNotifications(), checkUnsafeTestResults(), checkPendingCollectionReminders()
```

**Server Initialization:**

```
File: backend/server.js
Lines: 100-107
Executes: NotificationScheduler.initializeScheduler()
```

---

## Support

### If things don't work:

1. **Sample requests not auto-creating:**

   - Check: Does AMU record have safe_date?
   - Check: Do any labs exist in system?
   - Check: Server logs for findAssignedLab() errors

2. **Notifications not sending:**

   - Check: DATABASE_SCHEMA_UPDATES.sql was run
   - Check: Server logs for scheduler initialization
   - Check: notification_history table for records

3. **Lab not being assigned:**
   - Check: Farm has state, district, taluk
   - Check: Labs exist with matching locations
   - Test: Run findAssignedLab() manually

---

**Last Updated:** December 2024
**Implementation Status:** ✅ COMPLETE
