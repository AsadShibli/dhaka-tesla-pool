-- Neighborhood centers for distance. Not a door-level GPS point.
CREATE TABLE areas (
  code text PRIMARY KEY,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL
);

INSERT INTO areas (code, name, lat, lng) VALUES
  ('banani', 'Banani', 23.7937, 90.4066),
  ('gulshan-1', 'Gulshan 1', 23.7806, 90.4167),
  ('mohakhali', 'Mohakhali', 23.7786, 90.3976),
  ('dhanmondi', 'Dhanmondi', 23.7465, 90.3760),
  ('mirpur', 'Mirpur', 23.8223, 90.3654),
  ('uttara', 'Uttara', 23.8759, 90.3795),
  ('farmgate', 'Farmgate', 23.7569, 90.3875),
  ('bashundhara', 'Bashundhara', 23.8125, 90.4280);
