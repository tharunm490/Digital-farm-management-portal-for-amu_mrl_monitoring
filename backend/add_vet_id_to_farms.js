const mysql = require('mysql2');
const dbConfig = require('./config/database').pool.config.connectionConfig;

const connection = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database
});

connection.connect(err => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to database.');

    const alterQuery = `
    ALTER TABLE farms
    ADD COLUMN vet_id INT NULL,
    ADD CONSTRAINT fk_farm_vet FOREIGN KEY (vet_id) REFERENCES users(user_id) ON DELETE SET NULL;
  `;

    connection.query(alterQuery, (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('Column vet_id already exists.');
            } else {
                console.error('Error adding vet_id column:', err);
            }
        } else {
            console.log('Successfully added vet_id column to farms table.');
        }
        connection.end();
    });
});
