const db = require('./config/database');
const Notification = require('./models/Notification');

async function populateNotifications() {
  try {
    console.log('Starting notification population...');

    // Populate for AMU records (unsafe, borderline, and overdosage)
    const amuQuery = `
      SELECT a.*, e.tag_id, e.batch_name, t.medicine, t.user_id
      FROM amu_records a
      JOIN animals_or_batches e ON a.entity_id = e.entity_id
      JOIN treatment_records t ON a.treatment_id = t.treatment_id
      WHERE a.risk_category IN ('unsafe', 'borderline') OR a.overdosage = 1
    `;
    const [amuRows] = await db.execute(amuQuery);

    for (const amu of amuRows) {
      let subtype = 'unsafe_mrl';
      let message = '';

      if (amu.overdosage === 1) {
        subtype = 'overdosage';
        message = `Overdosage detected for ${amu.medicine} in ${amu.tag_id || amu.batch_name}. Please review treatment.`;
      } else if (amu.risk_category === 'unsafe') {
        subtype = 'unsafe_mrl';
        message = `Unsafe residual limit detected for ${amu.medicine} in ${amu.tag_id || amu.batch_name}. Risk category: ${amu.risk_category}`;
      } else {
        subtype = 'high_dosage';
        message = `Borderline condition detected for ${amu.medicine} in ${amu.tag_id || amu.batch_name}. Risk category: ${amu.risk_category}`;
      }

      // Check if notification already exists
      const checkQuery = `
        SELECT COUNT(*) as count FROM notification_history
        WHERE user_id = ? AND type = 'alert' AND amu_id = ?
      `;
      const [checkRows] = await db.execute(checkQuery, [amu.user_id, amu.amu_id]);
      if (checkRows[0].count === 0) {
        await Notification.create({
          user_id: amu.user_id,
          type: 'alert',
          subtype: subtype,
          message: message,
          entity_id: amu.entity_id,
          treatment_id: amu.treatment_id,
          amu_id: amu.amu_id
        });
        console.log(`Created ${subtype} notification for AMU ${amu.amu_id}`);
      }
    }

    // Populate for vaccination history
    const vaccQuery = `
      SELECT v.*, e.tag_id, e.batch_name, t.user_id
      FROM vaccination_history v
      JOIN animals_or_batches e ON v.entity_id = e.entity_id
      JOIN treatment_records t ON v.treatment_id = t.treatment_id
    `;
    const [vaccRows] = await db.execute(vaccQuery);

    for (const vacc of vaccRows) {
      // Check if notification already exists
      const checkQuery = `
        SELECT COUNT(*) as count FROM notification_history
        WHERE user_id = ? AND type = 'vaccination' AND vacc_id = ?
      `;
      const [checkRows] = await db.execute(checkQuery, [vacc.user_id, vacc.vacc_id]);
      if (checkRows[0].count === 0) {
        await Notification.create({
          user_id: vacc.user_id,
          type: 'vaccination',
          message: `Vaccination completed for ${vacc.tag_id || vacc.batch_name} - ${vacc.vaccine_name}`,
          entity_id: vacc.entity_id,
          treatment_id: vacc.treatment_id,
          vacc_id: vacc.vacc_id
        });
        console.log(`Created notification for vaccination ${vacc.vacc_id}`);
      }
    }

    // Populate for upcoming vaccinations (due within next 30 days)
    const upcomingVaccQuery = `
      SELECT v.*, e.tag_id, e.batch_name, t.user_id, t.medicine,
             DATEDIFF(v.next_due_date, CURDATE()) as days_until_due
      FROM vaccination_history v
      JOIN animals_or_batches e ON v.entity_id = e.entity_id
      JOIN treatment_records t ON v.treatment_id = t.treatment_id
      WHERE v.next_due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
        AND v.next_due_date > CURDATE()
    `;
    const [upcomingVaccRows] = await db.execute(upcomingVaccQuery);

    for (const vacc of upcomingVaccRows) {
      // Check if upcoming notification already exists
      const checkQuery = `
        SELECT COUNT(*) as count FROM notification_history
        WHERE user_id = ? AND type = 'vaccination' AND vacc_id = ? AND message LIKE 'Upcoming%'
      `;
      const [checkRows] = await db.execute(checkQuery, [vacc.user_id, vacc.vacc_id]);
      if (checkRows[0].count === 0) {
        await Notification.create({
          user_id: vacc.user_id,
          type: 'vaccination',
          message: `Upcoming vaccination: ${vacc.vaccine_name} due in ${vacc.days_until_due} days for ${vacc.tag_id || vacc.batch_name}`,
          entity_id: vacc.entity_id,
          treatment_id: vacc.treatment_id,
          vacc_id: vacc.vacc_id
        });
        console.log(`Created upcoming vaccination notification for ${vacc.vacc_id}`);
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