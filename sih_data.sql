USE railway;

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    auth_provider VARCHAR(50) NOT NULL,
    google_uid VARCHAR(255),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT,
    display_name VARCHAR(100),
    role ENUM('farmer', 'authority', 'veterinarian') NOT NULL,
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
    dose_unit VARCHAR(50), -- FIXED: Increased size from default
    frequency_per_day INT,
    duration_days INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

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
    dose_unit VARCHAR(50), -- FIXED: Increased size
    frequency_per_day INT,
    duration_days INT,
    start_date DATE,
    end_date DATE,
    predicted_mrl DOUBLE,
    predicted_withdrawal_days INT,
    safe_date DATE,
    overdosage BOOLEAN DEFAULT FALSE, -- FIXED: Added column
    risk_percent DECIMAL(5,2), -- FIXED: Added column
    worst_tissue VARCHAR(50), -- FIXED: Added column
    risk_category VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id),
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- FIXED: Added missing table
CREATE TABLE amu_tissue_results (
    tissue_result_id INT PRIMARY KEY AUTO_INCREMENT,
    amu_id INT NOT NULL,
    tissue VARCHAR(50) NOT NULL,
    predicted_mrl DECIMAL(10,2),
    base_mrl DECIMAL(10,2),
    risk_percent DECIMAL(5,2),
    risk_category VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id) ON DELETE CASCADE
);

CREATE TABLE qr_records (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    qr_payload TEXT,
    qr_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id)
);

-- FIXED: Renamed from notification_history to notifications and added columns
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50), -- FIXED: Added column
    title VARCHAR(255),
    message TEXT NOT NULL,
    severity ENUM('info', 'warning', 'critical') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    entity_id INT,
    treatment_id INT,
    amu_id INT,
    vacc_id INT, -- FIXED: Added column
    related_record_id INT,
    related_table VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id) ON DELETE CASCADE,
    FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id) ON DELETE CASCADE
);

CREATE TABLE tamper_proof_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    record_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE drug_master (
    drug_id INT AUTO_INCREMENT PRIMARY KEY,
    drug_name VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255) NOT NULL,
    drug_class VARCHAR(100),
    who_criticality ENUM('critically_important', 'highly_important', 'important') NOT NULL DEFAULT 'important',
    banned_for_food_animals BOOLEAN DEFAULT FALSE,
    common_indications TEXT,
    side_effects TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_drug (drug_name, active_ingredient)
);

CREATE TABLE mrl_reference (
    mrl_id INT AUTO_INCREMENT PRIMARY KEY,
    drug_id INT NOT NULL,
    species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
    matrix ENUM('milk','meat','egg') NOT NULL,
    mrl_value_ppb DOUBLE NOT NULL,
    mrl_value_ppm DOUBLE,
    withdrawal_days INT NOT NULL,
    source ENUM('codex','fssai','woah','other') NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (drug_id) REFERENCES drug_master(drug_id) ON DELETE CASCADE,
    UNIQUE KEY unique_mrl (drug_id, species, matrix, source)
);
