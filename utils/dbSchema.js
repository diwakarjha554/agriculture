import { db } from './db.js';

export const createDbSchema = async () => {
  try {
    // Users
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone BIGINT UNIQUE,
        device_type ENUM('I', 'A', 'W') DEFAULT 'W',
        status ENUM('1', '0') DEFAULT '1',
        language_code VARCHAR(10),
        language_name TEXT,
        is_admin ENUM('1', '0') DEFAULT '0',
        fcm_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // TODO : need to modify this table
    // Languages -- not in use
    await db.query(`
      CREATE TABLE IF NOT EXISTS languages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        language_code VARCHAR(10) UNIQUE,
        language_name VARCHAR(50),
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // User Tokens
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // OTP Requests
    await db.query(`
      CREATE TABLE IF NOT EXISTS otps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone BIGINT UNIQUE,
        otp_code BIGINT,
        expires_at TIMESTAMP
      );
    `);

    // Video Tutorials
    await db.query(`
      CREATE TABLE IF NOT EXISTS video_tutorials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        video_url TEXT,
        language_code VARCHAR(10),
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Crop Types
    await db.query(`
      CREATE TABLE IF NOT EXISTS crop_types (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(100),
        name_pa VARCHAR(100),
        name_bgc_in VARCHAR(100),
        name_hi VARCHAR(100),
        name_raj_in VARCHAR(100),
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Harvesters
    await db.query(`
      CREATE TABLE IF NOT EXISTS harvesters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(100),
        name_pa VARCHAR(100),
        name_bgc_in VARCHAR(100),
        name_hi VARCHAR(100),
        name_raj_in VARCHAR(100),
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Transport Arrangements
    await db.query(`
      CREATE TABLE IF NOT EXISTS transport_arrangements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(100),
        name_pa VARCHAR(100),
        name_bgc_in VARCHAR(100),
        name_hi VARCHAR(100),
        name_raj_in VARCHAR(100),
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Land Size Units
    await db.query(`
      CREATE TABLE IF NOT EXISTS land_size_units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_en VARCHAR(100),
        name_pa VARCHAR(100),
        name_bgc_in VARCHAR(100),
        name_hi VARCHAR(100),
        name_raj_in VARCHAR(100),
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    // Crop Submissions
    await db.query(`
      CREATE TABLE IF NOT EXISTS crop_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        image_url TEXT,
        state VARCHAR(100),
        district VARCHAR(100),
        latitude DECIMAL(10,7),
        longitude DECIMAL(10,7),
        land_size DECIMAL(10,2),
        land_unit VARCHAR(50),
        crop_details TEXT,
        crop_expected_yield DECIMAL(10,2),
        crop_expected_harvesting_date DATE,
        harvester_used_id INT,
        expected_rate DECIMAL(10,2),
        transport_arrangement_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (harvester_used_id) REFERENCES harvesters(id),
        FOREIGN KEY (transport_arrangement_id) REFERENCES transport_arrangements(id)
      );
    `);

    // Privacy Policy
    await db.query(`
      CREATE TABLE IF NOT EXISTS privacy_policy (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        content LONGTEXT,
        status ENUM('1', '0') DEFAULT '1',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log('All tables created successfully.');
  } catch (error) {
    console.error('Error creating DB schema:', error.message);
  }
};
