-- =========================================
-- BIOMASS-BASED AMU ANALYTICS DATABASE SETUP
-- =========================================

-- Create reference table for default species weights
CREATE TABLE IF NOT EXISTS species_avg_weights (
    species ENUM('cattle','goat','sheep','pig','poultry') PRIMARY KEY,
    avg_weight_kg DOUBLE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default weights
INSERT IGNORE INTO species_avg_weights VALUES
('cattle', 350),
('goat', 40),
('sheep', 55),
('pig', 120),
('poultry', 2);

-- Verify the table
SELECT * FROM species_avg_weights;
