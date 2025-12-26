-- Fix veterinarian registration issue
-- Make vet_name nullable since it can be updated later
ALTER TABLE veterinarians MODIFY COLUMN vet_name VARCHAR(100) NULL;
