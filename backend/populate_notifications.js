const db = require('./config/database');
const Notification = require('./models/Notification');

async function populateNotifications() {
  try {
    console.log('Starting notification population...');

    // Populate for AMU records (unsafe and borderline)
    const amuQuery = `
      SELECT a.*, e.tag_id, e.batch_name, t.medicine
      FROM amu_records a
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      WHERE a.risk_category IN ('unsafe', 'borderline')
    `;
    const [amuRows] = await db.execute(amuQuery);

    for (const amu of amuRows) {
      // Check if notification already exists
      const checkQuery = `
        SELECT COUNT(*) as count FROM notification_history
        WHERE user_id = ? AND type = 'dosage_alert' AND related_treatment_id = ?
      `;
      const [checkRows] = await db.execute(checkQuery, [amu.user_id, amu.treatment_id]);
      if (checkRows[0].count === 0) {
        await Notification.create({
          user_id: amu.user_id,
          type: 'dosage_alert',
          message: `${amu.risk_category === 'unsafe' ? 'Unsafe' : 'Borderline'} condition detected for ${amu.medicine} in ${amu.tag_id || amu.batch_name}. Risk category: ${amu.risk_category}`,
          related_entity_id: amu.entity_id,
          related_treatment_id: amu.treatment_id
        });
        console.log(`Created notification for AMU ${amu.amu_id}`);
      }
    }

    // Populate for vaccination history
    const vaccQuery = `
      SELECT v.*, e.tag_id, e.batch_name
      FROM vaccination_history v
      JOIN animals_or_batches e ON v.entity_id = e.entity_id
    `;
    const [vaccRows] = await db.execute(vaccQuery);

    for (const vacc of vaccRows) {
      // Check if notification already exists
      const checkQuery = `
        SELECT COUNT(*) as count FROM notification_history
        WHERE user_id = (SELECT user_id FROM treatment_records WHERE treatment_id = ?) AND type = 'vaccination' AND related_treatment_id = ?
      `;
      const [checkRows] = await db.execute(checkQuery, [vacc.treatment_id, vacc.treatment_id]);
      if (checkRows[0].count === 0) {
        // Get user_id from treatment
        const userQuery = 'SELECT user_id FROM treatment_records WHERE treatment_id = ?';
        const [userRows] = await db.execute(userQuery, [vacc.treatment_id]);
        const user_id = userRows[0].user_id;

        await Notification.create({
          user_id,
          type: 'vaccination',
          message: `Vaccination completed for ${vacc.tag_id || vacc.batch_name} - ${vacc.vaccine_name}`,
          related_entity_id: vacc.entity_id,
          related_treatment_id: vacc.treatment_id
        });
        console.log(`Created notification for vaccination ${vacc.vacc_id}`);
      }
    }

    console.log('Notification population completed.');
  } catch (error) {
    console.error('Error populating notifications:', error);
  } finally {
    process.exit();
  }
}

populateNotifications();