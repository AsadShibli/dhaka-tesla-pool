-- Demo cast. Shared password is pool-demo, stored here as a bcrypt hash.
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Jashim', 'jashim@dhaka-tesla.local', '$2a$10$i9QWUE0GNPnSqqbqh36FE.dtMlA1r76yrDtCvpxQKZF2.uFMWd83K', 'driver'),
  ('Nusrat', 'nusrat@dhaka-tesla.local', '$2a$10$i9QWUE0GNPnSqqbqh36FE.dtMlA1r76yrDtCvpxQKZF2.uFMWd83K', 'passenger'),
  ('Rafiq', 'rafiq@dhaka-tesla.local', '$2a$10$i9QWUE0GNPnSqqbqh36FE.dtMlA1r76yrDtCvpxQKZF2.uFMWd83K', 'passenger'),
  ('Shirin', 'shirin@dhaka-tesla.local', '$2a$10$i9QWUE0GNPnSqqbqh36FE.dtMlA1r76yrDtCvpxQKZF2.uFMWd83K', 'passenger');

-- Jashim's three-seat Tesla. He starts offline.
INSERT INTO vehicles (driver_id, name, capacity, is_online)
SELECT id, 'Bullet', 3, false FROM users WHERE email = 'jashim@dhaka-tesla.local';

-- 100000 poisha is 1000 BDT, enough to try TeslaPay in the demo.
INSERT INTO wallets (user_id, balance_poisha)
SELECT id, 100000 FROM users
WHERE email LIKE '%@dhaka-tesla.local';
