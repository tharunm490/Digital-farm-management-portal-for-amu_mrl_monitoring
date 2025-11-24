const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateConstraint() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'sih'
  });

  try {
    console.log('Updating database constraint...');

    // Drop the existing constraint
    await connection.execute('ALTER TABLE treatment_records DROP CHECK treatment_records_chk_1');
    console.log('Dropped old constraint');

    // Add the new constraint that excludes pigs from requiring vets
    await connection.execute(`
      ALTER TABLE treatment_records ADD CONSTRAINT treatment_records_chk_1
      CHECK (
        (species IN ('cattle', 'goat', 'sheep') AND vet_id IS NOT NULL AND vet_name IS NOT NULL) OR
        (species IN ('poultry', 'pig') AND vet_id IS NULL AND vet_name IS NULL)
      )
    `);

    console.log('Database constraint updated successfully - pigs no longer require vet information');
  } catch (error) {
    console.error('Error updating constraint:', error.message);
  } finally {
    await connection.end();
  }
}

updateConstraint();