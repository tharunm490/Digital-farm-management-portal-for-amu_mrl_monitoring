
use railways;
-- ============================
-- USERS TABLES
-- ============================


CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    auth_provider VARCHAR(50) NOT NULL,
    google_uid VARCHAR(255),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT,
    display_name VARCHAR(100),
    role ENUM('farmer','authority','veterinarian') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE farmers (
    farmer_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    state VARCHAR(50),
    district VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE TABLE farms (
    farm_id INT AUTO_INCREMENT PRIMARY KEY,
    farmer_id INT NOT NULL,
    farm_name VARCHAR(100) NOT NULL,
    latitude DOUBLE,
    longitude DOUBLE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id)
);

CREATE TABLE veterinarians (
    vet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    vet_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(100),
    phone VARCHAR(20),
    state VARCHAR(50),
    district VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================
-- ANIMAL / BATCH TABLE
-- ============================

CREATE TABLE animals_or_batches (
    entity_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type ENUM('animal','batch') NOT NULL,
    farm_id INT NOT NULL,

    species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
    tag_id VARCHAR(50),
    batch_name VARCHAR(100),
    batch_count INT DEFAULT NULL,

    matrix ENUM('milk','meat','egg') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (farm_id) REFERENCES farms(farm_id)
);

-- ============================
-- TREATMENT RECORDS
-- ============================

CREATE TABLE treatment_records (
    treatment_id INT AUTO_INCREMENT PRIMARY KEY,

    entity_id INT NOT NULL,
    farm_id INT NOT NULL,
    user_id INT NOT NULL,

    species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
    medication_type VARCHAR(100) NOT NULL,

    is_vaccine BOOLEAN DEFAULT FALSE,
    vaccine_interval_days INT,
    vaccine_total_months INT,
    next_due_date DATE,
    vaccine_end_date DATE,

    vet_id INT,
    vet_name VARCHAR(100),

    reason VARCHAR(255),
    diagnosis TEXT,
    cause VARCHAR(255),

    medicine VARCHAR(255) NOT NULL,

    start_date DATE,
    end_date DATE,

    route ENUM('IM','IV','SC','oral','water','feed') NOT NULL,

    dose_amount DOUBLE,
    dose_unit VARCHAR(50),
    frequency_per_day INT,
    duration_days INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),

    CHECK (
        (
            species IN ('cattle','goat','sheep','pig')
            AND vet_id IS NOT NULL
            AND vet_name IS NOT NULL
            AND route IN ('IM','IV','SC','oral')
        )
        OR
        (
            species = 'poultry'
            AND vet_id IS NULL
            AND vet_name IS NULL
            AND route IN ('water','feed','oral')
        )
    ),

    CHECK (
        (
            medication_type = 'vaccine'
            AND is_vaccine = TRUE
            AND vaccine_interval_days IS NOT NULL
            AND vaccine_total_months IS NOT NULL
            AND next_due_date IS NOT NULL
            AND vaccine_end_date IS NOT NULL
        )
        OR
        (
            medication_type <> 'vaccine'
            AND is_vaccine = FALSE
            AND vaccine_interval_days IS NULL
            AND vaccine_total_months IS NULL
            AND next_due_date IS NULL
            AND vaccine_end_date IS NULL
        )
    )
);

-- ============================
-- VACCINATION HISTORY
-- ============================

CREATE TABLE vaccination_history (
    vacc_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    treatment_id INT NOT NULL,

    vaccine_name VARCHAR(255) NOT NULL,
    given_date DATE NOT NULL,
    interval_days INT NOT NULL,
    next_due_date DATE NOT NULL,

    vaccine_total_months INT,
    vaccine_end_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id)
);

-- ============================
-- AMU (ANTIMICROBIAL & MEDICINE USE) RECORDS
-- ============================

CREATE TABLE amu_records (
    amu_id INT AUTO_INCREMENT PRIMARY KEY,

    treatment_id INT NOT NULL,
    entity_id INT NOT NULL,
    farm_id INT NOT NULL,
    user_id INT NOT NULL,

    species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
    medication_type VARCHAR(100) NOT NULL,

    matrix ENUM('milk','meat','egg'),
    medicine VARCHAR(255) NOT NULL,

    active_ingredient VARCHAR(255),
    category_type VARCHAR(50),
    reason VARCHAR(255),
    cause VARCHAR(255),

    route ENUM('IM','IV','SC','oral','water','feed'),
    dose_amount DOUBLE,
    dose_unit VARCHAR(50),
    frequency_per_day INT,
    duration_days INT,

    start_date DATE,
    end_date DATE,

    predicted_mrl DOUBLE,
    predicted_withdrawal_days INT,
    safe_date DATE,

    overdosage BOOLEAN DEFAULT FALSE,
    risk_category VARCHAR(20),

    worst_tissue ENUM('muscle','fat','liver','kidney') NULL,
    model_version VARCHAR(50) DEFAULT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id),
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
ALTER TABLE amu_records ADD COLUMN risk_percent DECIMAL(5,2) NULL AFTER safe_date;
-- ============================
-- NEW TABLE (ADDED SCIENTIFICALLY REQUIRED)
-- Store tissue-wise MRL predictions for MEAT
-- ============================

CREATE TABLE amu_tissue_results (
    tissue_id INT AUTO_INCREMENT PRIMARY KEY,

    amu_id INT NOT NULL,

    tissue ENUM('muscle','fat','liver','kidney') NOT NULL,

    predicted_mrl DOUBLE,
    base_mrl DOUBLE,
    risk_percent DOUBLE,
    risk_category ENUM('safe','borderline','unsafe') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id)
);

-- ============================
-- QR TABLE
-- ============================

CREATE TABLE qr_records (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    qr_payload TEXT,
    qr_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id)
);

-- ============================
-- NOTIFICATION HISTORY
-- ============================

CREATE TABLE notification_history (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('vaccination','alert') NOT NULL,
    subtype ENUM('unsafe_mrl','high_dosage','overdosage') DEFAULT NULL,
    message TEXT NOT NULL,

    entity_id INT,
    treatment_id INT,
    amu_id INT,
    vacc_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id),
    FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id),
    FOREIGN KEY (vacc_id) REFERENCES vaccination_history(vacc_id)
);

-- ============================
-- TAMPER PROOF HASH LOG
-- ============================

CREATE TABLE tamper_proof_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    record_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
