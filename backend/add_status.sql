-- Add status column to treatment_records table
ALTER TABLE treatment_records ADD COLUMN status ENUM('pending', 'approved', 'completed') DEFAULT 'approved';

-- Update existing treatments created by farmers to 'pending' if no vet_id
UPDATE treatment_records SET status = 'pending' WHERE vet_id IS NULL AND species IN ('cattle', 'goat', 'sheep', 'pig');