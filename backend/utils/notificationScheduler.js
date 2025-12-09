/**
 * Notification Scheduler for Laboratory Module
 * 
 * This module handles periodic checks for reaching safe dates and sends notifications
 * to assigned labs when samples are ready for collection.
 */

const db = require('../config/database');
const Notification = require('../models/Notification');

class NotificationScheduler {
  /**
   * Check for sample requests that have reached their safe date
   * and send notifications to assigned labs
   * 
   * Called periodically (e.g., every 6 hours or daily)
   */
  static async checkSafeDateNotifications() {
    try {
      console.log('\n🔔 Starting Safe Date Notification Check...');
      
      // Query: Find all 'requested' sample requests where safe_date has been reached today or earlier
      const query = `
        SELECT sr.sample_request_id, sr.treatment_id, sr.entity_id, sr.assigned_lab_id, sr.safe_date, sr.farmer_id,
               a.species, a.tag_id, a.batch_name,
               f.farm_name, f.district, f.state,
               t.medicine, tr.display_name as farmer_name
        FROM sample_requests sr
        JOIN animals_or_batches a ON a.entity_id = sr.entity_id
        JOIN farms f ON f.farm_id = a.farm_id
        JOIN treatment_records t ON t.treatment_id = sr.treatment_id
        LEFT JOIN farmers fm ON fm.farmer_id = sr.farmer_id
        LEFT JOIN users tr ON tr.user_id = fm.user_id
        WHERE sr.status = 'requested' 
        AND DATE(sr.safe_date) <= CURDATE()
      `;
      
      const [pendingRequests] = await db.execute(query);
      
      if (pendingRequests.length === 0) {
        console.log('✅ No pending safe date notifications to send');
        return;
      }
      
      console.log(`📊 Found ${pendingRequests.length} sample requests ready for collection\n`);
      
      // Group notifications by lab_id to send bulk notifications
      const notificationsByLab = {};
      
      for (const request of pendingRequests) {
        const lab_id = request.assigned_lab_id;
        if (!notificationsByLab[lab_id]) {
          notificationsByLab[lab_id] = [];
        }
        notificationsByLab[lab_id].push(request);
      }
      
      // Send notifications to each lab
      let notificationsCreated = 0;
      for (const [lab_id, requests] of Object.entries(notificationsByLab)) {
        try {
          // Get lab user_id from laboratories table
          const [labRows] = await db.execute('SELECT user_id FROM laboratories WHERE lab_id = ?', [lab_id]);
          if (!labRows || labRows.length === 0) {
            console.warn(`⚠️ Lab ID ${lab_id} not found in system`);
            continue;
          }
          
          const lab_user_id = labRows[0].user_id;
          
          // Create notification for the lab
          const message = requests.length === 1
            ? `Withdrawal period completed. 1 sample ready for collection (${requests[0].species} - ${requests[0].farm_name})`
            : `Withdrawal period completed. ${requests.length} samples ready for collection`;
          
          const notificationId = await Notification.create({
            user_id: lab_user_id,
            type: 'alert',
            subtype: null,
            message: message
          });
          
          console.log(`✅ Notification sent to Lab ${lab_id}: "${message}"`);
          notificationsCreated++;
          
        } catch (labError) {
          console.error(`❌ Error sending notification to lab ${lab_id}:`, labError.message);
        }
      }
      
      console.log(`\n📧 Notification check complete. ${notificationsCreated} notifications created.\n`);
      return notificationsCreated;
      
    } catch (error) {
      console.error('❌ Error in checkSafeDateNotifications:', error.message);
    }
  }
  
  /**
   * Check for unsafe test results and send alerts to authority
   */
  static async checkUnsafeTestResults() {
    try {
      console.log('\n🚨 Checking for unsafe test results...');
      
      const query = `
        SELECT ltr.report_id, ltr.sample_id, ltr.detected_residue, ltr.mrl_limit, ltr.final_status,
               sr.entity_id, sr.treatment_id, a.species, a.tag_id,
               f.farm_name, fr.display_name as farmer_name
        FROM lab_test_reports ltr
        JOIN samples s ON s.sample_id = ltr.sample_id
        JOIN sample_requests sr ON sr.sample_request_id = s.sample_request_id
        JOIN animals_or_batches a ON a.entity_id = sr.entity_id
        JOIN farms f ON f.farm_id = a.farm_id
        LEFT JOIN farmers fm ON fm.farmer_id = sr.farmer_id
        LEFT JOIN users fr ON fr.user_id = fm.user_id
        WHERE ltr.final_status = 'unsafe'
      `;
      
      const [unsafeReports] = await db.execute(query);
      
      if (unsafeReports.length === 0) {
        console.log('✅ No unsafe test results to notify');
        return;
      }
      
      console.log(`🚨 Found ${unsafeReports.length} unsafe test results\n`);
      
      let notificationsCreated = 0;
      for (const report of unsafeReports) {
        try {
          // Get authority users
          const [authorityUsers] = await db.execute('SELECT user_id FROM users WHERE role = "authority"');
          
          for (const authUser of authorityUsers) {
            const message = `🚨 UNSAFE RESIDUE: ${report.species} (${report.tag_id}) at ${report.farm_name} - Residue: ${report.detected_residue} (Limit: ${report.mrl_limit})`;
            
            await Notification.create({
              user_id: authUser.user_id,
              type: 'alert',
              subtype: 'unsafe_residue',
              message: message,
              entity_id: report.entity_id,
              treatment_id: report.treatment_id
            });
          }
          
          console.log(`✅ Unsafe alert sent for Report ${report.report_id}`);
          notificationsCreated++;
          
        } catch (reportError) {
          console.error(`❌ Error processing unsafe report ${report.report_id}:`, reportError.message);
        }
      }
      
      console.log(`\n📧 Unsafe results check complete. ${notificationsCreated} alerts created.\n`);
      return notificationsCreated;
      
    } catch (error) {
      console.error('❌ Error in checkUnsafeTestResults:', error.message);
    }
  }
  
  /**
   * Check for pending samples that haven't been collected within a certain timeframe
   * Send reminder notifications to labs
   */
  static async checkPendingCollectionReminders() {
    try {
      console.log('\n⏰ Checking for pending collection reminders...');
      
      // Find requested samples that are 2+ days overdue for collection
      const query = `
        SELECT sr.sample_request_id, sr.assigned_lab_id, sr.safe_date, sr.entity_id,
               a.species, a.tag_id, f.farm_name,
               DATEDIFF(CURDATE(), DATE(sr.safe_date)) as days_overdue
        FROM sample_requests sr
        JOIN animals_or_batches a ON a.entity_id = sr.entity_id
        JOIN farms f ON f.farm_id = a.farm_id
        WHERE sr.status = 'requested'
        AND DATE(sr.safe_date) <= DATE_SUB(CURDATE(), INTERVAL 2 DAY)
      `;
      
      const [pendingSamples] = await db.execute(query);
      
      if (pendingSamples.length === 0) {
        console.log('✅ No pending collection reminders needed');
        return;
      }
      
      console.log(`⏰ Found ${pendingSamples.length} overdue sample collections\n`);
      
      let remindersCreated = 0;
      for (const sample of pendingSamples) {
        try {
          const [labRows] = await db.execute('SELECT user_id FROM laboratories WHERE lab_id = ?', [sample.assigned_lab_id]);
          if (!labRows || labRows.length === 0) continue;
          
          const message = `⏰ REMINDER: Sample collection overdue by ${sample.days_overdue} days (${sample.species} - ${sample.farm_name})`;
          
          await Notification.create({
            user_id: labRows[0].user_id,
            type: 'alert',
            subtype: null,
            message: message,
            entity_id: sample.entity_id
          });
          
          console.log(`⏰ Reminder sent for overdue sample ${sample.sample_request_id}`);
          remindersCreated++;
          
        } catch (sampleError) {
          console.error(`❌ Error sending reminder for sample ${sample.sample_request_id}:`, sampleError.message);
        }
      }
      
      console.log(`\n📧 Collection reminder check complete. ${remindersCreated} reminders sent.\n`);
      return remindersCreated;
      
    } catch (error) {
      console.error('❌ Error in checkPendingCollectionReminders:', error.message);
    }
  }
  
  /**
   * Initialize all scheduled notification jobs
   * Call this once when the server starts
   */
  static initializeScheduler() {
    console.log('🔔 Initializing Notification Scheduler...');
    
    // Run initial check
    this.checkSafeDateNotifications();
    this.checkUnsafeTestResults();
    this.checkPendingCollectionReminders();
    
    // Schedule periodic checks
    // Check safe dates every 6 hours
    setInterval(() => {
      this.checkSafeDateNotifications();
    }, 6 * 60 * 60 * 1000); // 6 hours
    
    // Check unsafe results every 2 hours
    setInterval(() => {
      this.checkUnsafeTestResults();
    }, 2 * 60 * 60 * 1000); // 2 hours
    
    // Check pending reminders daily
    setInterval(() => {
      this.checkPendingCollectionReminders();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    console.log('✅ Notification Scheduler initialized');
    console.log('   - Safe date checks: Every 6 hours');
    console.log('   - Unsafe result checks: Every 2 hours');
    console.log('   - Pending collection reminders: Daily\n');
  }
}

module.exports = NotificationScheduler;
