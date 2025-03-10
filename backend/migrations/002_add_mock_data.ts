// backend/migrations/002_add_mock_data.ts
import { Connection } from 'mysql2/promise';

export async function up(connection: Connection): Promise<void> {
  // First, ensure researcher1@example.com exists
  await connection.execute(`
    INSERT IGNORE INTO users (email, hashed_password, created_at) 
    VALUES ('researcher1@example.com', 'password123', NOW())
  `);

  // Insert mock MAC address mappings
  await connection.execute(`
    INSERT IGNORE INTO mac_address_mapping (mac_address, dataset_name, description, owner) VALUES
    ('00:1A:2B:3C:4D:5E', 'Brain Activity Dataset', 'EEG recordings from cognitive tasks', 'Neuroscience Lab'),
    ('AA:BB:CC:DD:EE:FF', 'Heart Rate Variability', 'Cardiovascular measurements during exercise', 'Cardiology Dept'),
    ('11:22:33:44:55:66', 'Sleep Patterns Alpha', 'Sleep cycle analysis for patients with insomnia', 'Sleep Research Center'),
    ('22:33:44:55:66:77', 'Sleep Patterns Beta', 'Sleep cycle analysis for healthy individuals', 'Sleep Research Center'),
    ('33:44:55:66:77:88', 'Reaction Time Tests', 'Visual stimulus reaction measurements', 'Cognitive Sciences'),
    ('44:55:66:77:88:99', 'Gene Expression Dataset A', 'RNA sequencing from tissue samples', 'Genomics Division'),
    ('55:66:77:88:99:AA', 'Gene Expression Dataset B', 'Microarray data from blood samples', 'Genomics Division'),
    ('66:77:88:99:AA:BB', 'fMRI Brain Scans', 'Functional MRI during problem-solving tasks', 'Neuroscience Lab'),
    ('77:88:99:AA:BB:CC', 'Blood Pressure Monitoring', 'Continuous BP measurements over 24h period', 'Cardiology Dept'),
    ('88:99:AA:BB:CC:DD', 'Glucose Monitoring', 'Continuous glucose measurements in diabetic patients', 'Endocrinology')
  `);

  // Insert permissions for researcher1@example.com
  await connection.execute(`
    INSERT INTO permissions (email, owner, mac_address, experiment, is_admin, valid_from, valid_until, created_at) VALUES
    ('researcher1@example.com', 'Neuroscience Lab', '00:1A:2B:3C:4D:5E', 'brain_activity_experiment', true, DATE_SUB(NOW(), INTERVAL 90 DAY), DATE_ADD(NOW(), INTERVAL 275 DAY), NOW()),
    ('researcher1@example.com', 'Neuroscience Lab', '66:77:88:99:AA:BB', 'fmri_cognitive_study', false, DATE_SUB(NOW(), INTERVAL 60 DAY), DATE_ADD(NOW(), INTERVAL 305 DAY), NOW()),
    ('researcher1@example.com', 'Cardiology Dept', 'AA:BB:CC:DD:EE:FF', 'heart_rate_study', true, DATE_SUB(NOW(), INTERVAL 120 DAY), DATE_ADD(NOW(), INTERVAL 245 DAY), NOW()),
    ('researcher1@example.com', 'Cardiology Dept', '77:88:99:AA:BB:CC', 'blood_pressure_analysis', false, DATE_SUB(NOW(), INTERVAL 45 DAY), DATE_ADD(NOW(), INTERVAL 320 DAY), NOW()),
    ('researcher1@example.com', 'Sleep Research Center', '11:22:33:44:55:66', 'insomnia_patterns', true, DATE_SUB(NOW(), INTERVAL 180 DAY), DATE_ADD(NOW(), INTERVAL 185 DAY), NOW()),
    ('researcher1@example.com', 'Sleep Research Center', '22:33:44:55:66:77', 'normal_sleep_patterns', false, DATE_SUB(NOW(), INTERVAL 180 DAY), DATE_ADD(NOW(), INTERVAL 185 DAY), NOW()),
    ('researcher1@example.com', 'Cognitive Sciences', '33:44:55:66:77:88', 'visual_reaction_test', false, DATE_SUB(NOW(), INTERVAL 30 DAY), DATE_ADD(NOW(), INTERVAL 335 DAY), NOW()),
    ('researcher1@example.com', 'Genomics Division', '44:55:66:77:88:99', 'rna_seq_analysis', true, DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_ADD(NOW(), INTERVAL 215 DAY), NOW()),
    ('researcher1@example.com', 'Genomics Division', '55:66:77:88:99:AA', 'microarray_analysis', false, DATE_SUB(NOW(), INTERVAL 150 DAY), DATE_ADD(NOW(), INTERVAL 215 DAY), NOW()),
    ('researcher1@example.com', 'Endocrinology', '88:99:AA:BB:CC:DD', 'diabetes_glucose_monitoring', false, DATE_SUB(NOW(), INTERVAL 75 DAY), DATE_ADD(NOW(), INTERVAL 290 DAY), NOW())
  `);
}

export async function down(connection: Connection): Promise<void> {
  // Remove the permissions added for researcher1@example.com
  await connection.execute(`
    DELETE FROM permissions 
    WHERE email = 'researcher1@example.com' 
    AND mac_address IN (
      '00:1A:2B:3C:4D:5E', 'AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66', 
      '22:33:44:55:66:77', '33:44:55:66:77:88', '44:55:66:77:88:99', 
      '55:66:77:88:99:AA', '66:77:88:99:AA:BB', '77:88:99:AA:BB:CC', 
      '88:99:AA:BB:CC:DD'
    )
  `);

  // Remove the MAC address mappings we added
  await connection.execute(`
    DELETE FROM mac_address_mapping 
    WHERE mac_address IN (
      '00:1A:2B:3C:4D:5E', 'AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66', 
      '22:33:44:55:66:77', '33:44:55:66:77:88', '44:55:66:77:88:99', 
      '55:66:77:88:99:AA', '66:77:88:99:AA:BB', '77:88:99:AA:BB:CC', 
      '88:99:AA:BB:CC:DD'
    )
  `);
}
