-- Digital Farm Management Portal - Full Database Schema

CREATE DATABASE IF NOT EXISTS farm_management;
USE farm_management;

-- 1. Users & Authentication
CREATE TABLE IF NOT EXISTS users (
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255), -- Nullable for OAuth users
  full_name VARCHAR(255),
  role ENUM('farmer', 'veterinarian', 'authority', 'processor') NOT NULL,
  google_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Farmers Profile
CREATE TABLE IF NOT EXISTS farmers (
  farmer_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone VARCHAR(20),
  state VARCHAR(100),
  district VARCHAR(100),
  village VARCHAR(100),
  address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Farms
CREATE TABLE IF NOT EXISTS farms (
  farm_id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NOT NULL,
  farm_name VARCHAR(255) NOT NULL,
  species_group ENUM('Cattle', 'Poultry', 'Sheep', 'Goat', 'Pig', 'Mixed') NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_animals INT DEFAULT 0,
  vet_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farmer_id) REFERENCES farmers(farmer_id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 4. Entities (Animals or Batches)
CREATE TABLE IF NOT EXISTS animals_or_batches (
  entity_id INT AUTO_INCREMENT PRIMARY KEY,
  farm_id INT NOT NULL,
  entity_type ENUM('animal', 'batch') NOT NULL,
  tag_id VARCHAR(50), -- For animals
  batch_name VARCHAR(100), -- For batches
  species VARCHAR(50) NOT NULL,
  breed VARCHAR(100),
  age_months INT,
  weight_kg DECIMAL(10, 2),
  status ENUM('active', 'sold', 'deceased', 'quarantine') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
);

-- 5. Drug Master Data
CREATE TABLE IF NOT EXISTS drug_master (
  id INT AUTO_INCREMENT PRIMARY KEY, -- Using 'id' to match code usage
  name VARCHAR(255) NOT NULL,
  active_ingredient VARCHAR(255),
  drug_class VARCHAR(100),
  criticality ENUM('Critically Important', 'Highly Important', 'Important') DEFAULT 'Important',
  banned_for_food_animals BOOLEAN DEFAULT FALSE,
  strength VARCHAR(50),
  manufacturer VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. MRL Reference Data
CREATE TABLE IF NOT EXISTS mrl_reference (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drug_id INT NOT NULL,
  species VARCHAR(50) NOT NULL,
  matrix VARCHAR(50) NOT NULL, -- milk, meat, egg, etc.
  mrl_value DECIMAL(10, 4) NOT NULL, -- in ppm or ppb as standardized
  withdrawal_period_days INT NOT NULL,
  source VARCHAR(50),
  FOREIGN KEY (drug_id) REFERENCES drug_master(id) ON DELETE CASCADE
);

-- 7. Prescriptions
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id INT AUTO_INCREMENT PRIMARY KEY,
  vet_id INT NOT NULL, -- References users(user_id) where role='veterinarian'
  farm_id INT NOT NULL,
  diagnosis TEXT,
  notes TEXT,
  status ENUM('pending', 'approved', 'rejected', 'dispensed') DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES users(user_id)
);

-- 8. Prescription Items
CREATE TABLE IF NOT EXISTS prescription_items (
  item_id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  drug_id INT NOT NULL,
  dosage VARCHAR(100),
  duration_days INT,
  withdrawal_days INT,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON DELETE CASCADE,
  FOREIGN KEY (drug_id) REFERENCES drug_master(id)
);

-- 9. Treatment Records
CREATE TABLE IF NOT EXISTS treatment_records (
  treatment_id INT AUTO_INCREMENT PRIMARY KEY,
  entity_id INT NOT NULL,
  vet_id INT, -- Nullable if self-administered by farmer
  prescription_id INT, -- Nullable
  treatment_date DATE NOT NULL,
  diagnosis VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES users(user_id),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id)
);

-- 10. AMU Records (Details of treatment)
CREATE TABLE IF NOT EXISTS amu_records (
  amu_id INT AUTO_INCREMENT PRIMARY KEY,
  treatment_id INT NOT NULL,
  entity_id INT NOT NULL, -- Redundant but useful for queries
  medicine VARCHAR(255) NOT NULL, -- Drug name
  active_ingredient VARCHAR(255),
  dosage_administered DECIMAL(10, 2),
  unit VARCHAR(20),
  withdrawal_end_date DATE,
  risk_category ENUM('safe', 'borderline', 'unsafe') DEFAULT 'safe',
  FOREIGN KEY (treatment_id) REFERENCES treatment_records(treatment_id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id)
);

-- 11. AMU Tissue Results (MRL Monitoring)
CREATE TABLE IF NOT EXISTS amu_tissue_results (
  result_id INT AUTO_INCREMENT PRIMARY KEY,
  amu_id INT NOT NULL,
  sample_date DATE,
  detected_level DECIMAL(10, 4),
  risk_percent DECIMAL(5, 2), -- (detected / mrl) * 100
  status ENUM('pass', 'fail') DEFAULT 'pass',
  FOREIGN KEY (amu_id) REFERENCES amu_records(amu_id) ON DELETE CASCADE
);

-- 12. Blockchain Log (Audit Trail)
CREATE TABLE IF NOT EXISTS blockchain_log (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  record_type VARCHAR(50) NOT NULL, -- treatment, prescription, etc.
  record_id INT NOT NULL,
  farm_id INT,
  entity_id INT,
  user_id INT,
  action VARCHAR(50),
  data_hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64),
  verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 13. Notification Queue
CREATE TABLE IF NOT EXISTS notification_queue (
  notification_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  farm_id INT,
  entity_id INT,
  notification_type VARCHAR(50) NOT NULL, -- withdrawal_alert, mrl_risk, etc.
  channel VARCHAR(20) DEFAULT 'in_app',
  title VARCHAR(255),
  message TEXT,
  payload JSON,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(255),
  status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP NULL,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- 14. Tamper Proof Log (Redundant/Complementary to Blockchain Log)
CREATE TABLE IF NOT EXISTS tamper_proof (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entity_type VARCHAR(50),
  entity_id INT,
  record_hash VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. QR Codes
CREATE TABLE IF NOT EXISTS qr_codes (
  qr_id INT AUTO_INCREMENT PRIMARY KEY,
  entity_id INT NOT NULL,
  qr_payload TEXT NOT NULL,
  qr_image LONGTEXT, -- Base64
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES animals_or_batches(entity_id) ON DELETE CASCADE
);

-- 16. Farm AMU Metrics (Aggregated stats)
CREATE TABLE IF NOT EXISTS farm_amu_metrics (
  metric_id INT AUTO_INCREMENT PRIMARY KEY,
  farm_id INT NOT NULL,
  month_year VARCHAR(7), -- YYYY-MM
  total_treatments INT DEFAULT 0,
  unsafe_treatments INT DEFAULT 0,
  risk_score DECIMAL(5, 2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_farm_month (farm_id, month_year),
  FOREIGN KEY (farm_id) REFERENCES farms(farm_id) ON DELETE CASCADE
);
