
use railway;
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

    tag_id VARCHAR(50),          -- for individual animals
    batch_name VARCHAR(100),     -- for poultry/pig batches
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

    medication_type ENUM(
        'antibiotic','antiparasitic','anti-inflammatory',
        'NSAID','vitamin','vaccine','hormonal','other'
    ) NOT NULL,

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
    dose_unit ENUM('ml','mg','g','litre','kg','tablet','sachet'),

    frequency_per_day INT,
    duration_days INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id),

    -- SPECIES GROUP CATEGORY RULES
    CHECK (
        (
            species IN ('cattle','goat','sheep')
            AND vet_id IS NOT NULL
            AND vet_name IS NOT NULL
            AND route IN ('IM','IV','SC','oral')
        )
        OR
        (
            species IN ('pig','poultry')
            AND vet_id IS NULL
            AND vet_name IS NULL
            AND route IN ('water','feed','oral')
        )
    ),

    -- STRICT VACCINE LOGIC
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
ALTER TABLE treatment_records
MODIFY dose_unit VARCHAR(50);

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

    -- LINK TO TREATMENT
    treatment_id INT NOT NULL,
    entity_id INT NOT NULL,
    farm_id INT NOT NULL,
    user_id INT NOT NULL,

    -- COPIED FROM TREATMENT RECORDS (NO USER ENTRY)
    species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
    medication_type ENUM(
        'antibiotic','antiparasitic','anti-inflammatory',
        'NSAID','vitamin','vaccine','hormonal','other'
    ) NOT NULL,

    matrix ENUM('milk','meat','egg'),               -- from animals_or_batches
    medicine VARCHAR(255) NOT NULL,
    active_ingredient VARCHAR(255),                -- same as medicine
    category_type VARCHAR(50),                     -- same as medication_type
    reason VARCHAR(255),
    cause VARCHAR(255),

    route ENUM('IM','IV','SC','oral','water','feed'),
    dose_amount DOUBLE,
    dose_unit ENUM('ml','mg','g','litre','kg','tablet','sachet'),
    frequency_per_day INT,
    duration_days INT,

    start_date DATE,
    end_date DATE,

    -- ML PREDICTION OUTPUT
    predicted_mrl DOUBLE,
    predicted_withdrawal_days INT,
    predicted_mrl_risk DOUBLE,

    risk_category ENUM('safe','borderline','unsafe'),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id),
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id),
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
ALTER TABLE amu_records
ADD COLUMN safe_date DATE AFTER predicted_withdrawal_days;

CREATE TABLE qr_records (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    qr_payload TEXT,
    qr_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id)
);
CREATE TABLE tamper_proof_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    record_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- DRUG MASTER DATABASE
-- ========================================
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

-- ========================================
-- MRL REFERENCE DATA (CODEX/FSSAI)
-- ========================================
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

-- ========================================
-- COMPLIANCE ALERTS
-- ========================================
CREATE TABLE compliance_alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT,
    entity_id INT,
    user_id INT,
    alert_type ENUM('withdrawal_violation','high_amu','banned_drug','mrl_risk','critical_drug_overuse') NOT NULL,
    severity ENUM('low','medium','high','critical') NOT NULL,
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolution_notes TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_farm_severity (farm_id, severity),
    INDEX idx_created_at (created_at)
);

-- ========================================
-- BLOCKCHAIN/AUDIT LOG (HASH-BASED IMMUTABILITY)
-- ========================================
CREATE TABLE blockchain_log (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    record_type ENUM('prescription','treatment','dispatch','amu_record','verification') NOT NULL,
    record_id INT,
    farm_id INT,
    entity_id INT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    data_hash VARCHAR(255) NOT NULL,
    previous_hash VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_record (record_type, record_id),
    INDEX idx_farm_time (farm_id, created_at),
    INDEX idx_hash (data_hash)
);

-- ========================================
-- E-PRESCRIPTION RECORDS
-- ========================================
CREATE TABLE prescriptions (
    prescription_id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    vet_id INT NOT NULL,
    entity_id INT NOT NULL,
    drug_id INT NOT NULL,
    diagnosis TEXT NOT NULL,
    dose_amount DOUBLE NOT NULL,
    dose_unit VARCHAR(50) NOT NULL,
    frequency_per_day INT NOT NULL,
    duration_days INT NOT NULL,
    route ENUM('IM','IV','SC','oral','water','feed') NOT NULL,
    notes TEXT,
    digital_signature VARCHAR(500),
    approved_at TIMESTAMP NULL,
    expires_at TIMESTAMP,
    status ENUM('draft','approved','rejected','used','expired') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    FOREIGN KEY (vet_id) REFERENCES veterinarians(vet_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (drug_id) REFERENCES drug_master(drug_id) ON DELETE RESTRICT,
    INDEX idx_vet_farm (vet_id, farm_id),
    INDEX idx_status (status)
);

-- ========================================
-- WITHDRAWAL TRACKING
-- ========================================
CREATE TABLE withdrawal_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    treatment_id INT NOT NULL,
    entity_id INT NOT NULL,
    farm_id INT NOT NULL,
    medicine VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    calculated_safe_date DATE NOT NULL,
    withdrawal_days INT NOT NULL,
    matrix ENUM('milk','meat','egg') NOT NULL,
    species ENUM('cattle','goat','sheep','pig','poultry') NOT NULL,
    status ENUM('active','completed','breached','expired') DEFAULT 'active',
    sale_attempted_date DATE,
    compliance_status ENUM('safe','borderline','unsafe') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    INDEX idx_farm_date (farm_id, calculated_safe_date),
    INDEX idx_status (status, compliance_status)
);

-- ========================================
-- PROCESSOR/PROCUREMENT VERIFICATION
-- ========================================
CREATE TABLE processor_accounts (
    processor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_type ENUM('dairy','slaughterhouse','egg_center','other') NOT NULL,
    license_number VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    district VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY unique_processor (business_name, district)
);

CREATE TABLE batch_verification (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    entity_id INT NOT NULL,
    processor_id INT,
    qr_data VARCHAR(500) NOT NULL,
    verification_status ENUM('pending','accepted','rejected','hold') DEFAULT 'pending',
    withdrawal_status ENUM('safe','borderline','unsafe') DEFAULT 'pending',
    compliance_check_date TIMESTAMP,
    test_requested BOOLEAN DEFAULT FALSE,
    test_result VARCHAR(100),
    verified_by INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    FOREIGN KEY (processor_id) REFERENCES processor_accounts(processor_id) ON DELETE SET NULL,
    FOREIGN KEY (verified_by) REFERENCES processor_accounts(processor_id) ON DELETE SET NULL,
    INDEX idx_processor_date (processor_id, created_at),
    INDEX idx_status (verification_status, withdrawal_status)
);

-- ========================================
-- AUTHORITY MONITORING & COMPLIANCE
-- ========================================
CREATE TABLE authority_accounts (
    authority_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    authority_name VARCHAR(255) NOT NULL,
    authority_type ENUM('state','district','national','other') NOT NULL,
    jurisdiction_state VARCHAR(50),
    jurisdiction_district VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE inspection_reports (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    authority_id INT,
    inspector_notes TEXT,
    violations_found INT DEFAULT 0,
    recommendations TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    report_status ENUM('draft','submitted','reviewed','closed') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP NULL,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    FOREIGN KEY (authority_id) REFERENCES authority_accounts(authority_id) ON DELETE SET NULL,
    INDEX idx_farm_date (farm_id, created_at),
    INDEX idx_status (report_status)
);

-- ========================================
-- NOTIFICATIONS & ALERTS LOG
-- ========================================
CREATE TABLE notification_queue (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    farm_id INT,
    entity_id INT,
    notification_type ENUM('withdrawal_alert','safe_sale_date','mrl_risk','compliance_violation','recommendation','other') NOT NULL,
    channel ENUM('in_app','sms','whatsapp','email','push') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    payload JSON,
    status ENUM('pending','sent','failed','read') DEFAULT 'pending',
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(100),
    sent_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
    INDEX idx_user_status (user_id, status),
    INDEX idx_created_at (created_at)
);

-- ========================================
-- AMU RISK SCORING
-- ========================================
CREATE TABLE farm_amu_metrics (
    metric_id INT AUTO_INCREMENT PRIMARY KEY,
    farm_id INT NOT NULL,
    total_amu_records INT DEFAULT 0,
    total_amu_amount_mg DOUBLE DEFAULT 0,
    amu_per_kg_biomass DOUBLE DEFAULT 0,
    critically_important_count INT DEFAULT 0,
    banned_drug_count INT DEFAULT 0,
    withdrawal_violations INT DEFAULT 0,
    risk_score DOUBLE DEFAULT 0,
    risk_level ENUM('low','medium','high','critical') DEFAULT 'low',
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
    UNIQUE KEY unique_farm (farm_id),
    INDEX idx_risk_level (risk_level)
);

-- ========================================
-- INDICES FOR PERFORMANCE
-- ========================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_farms_farmer ON farms(farmer_id);
CREATE INDEX idx_amu_records_farm ON amu_records(farm_id, created_at);
CREATE INDEX idx_treatment_entity ON treatment_records(entity_id, created_at);
CREATE INDEX idx_drug_criticality ON drug_master(who_criticality);
