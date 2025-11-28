-- 1. Create the database
CREATE DATABASE IF NOT EXISTS farm_management;

-- 2. Select the database
USE farm_management;

-- 3. Create the users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('farmer', 'veterinarian', 'authority') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Insert test users (Password is 'password123' hashed)
-- You can use these credentials to login:
-- Farmer: farmer@test.com / password123
-- Vet: vet@test.com / password123
-- Authority: authority@test.com / password123

INSERT INTO users (name, email, password, role) VALUES 
('Test Farmer', 'farmer@test.com', '$2b$10$YourHashedPasswordHereOrPlaintextIfNoHashing', 'farmer'),
('Test Vet', 'vet@test.com', '$2b$10$YourHashedPasswordHereOrPlaintextIfNoHashing', 'veterinarian'),
('Test Authority', 'authority@test.com', '$2b$10$YourHashedPasswordHereOrPlaintextIfNoHashing', 'authority');

-- Note: The backend uses bcrypt. If you want to login immediately without hashing, 
-- you might need to register a new user via the /register page after setting up the table.
