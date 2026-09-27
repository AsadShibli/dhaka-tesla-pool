-- Accounts for passengers and drivers. Password is stored as a hash.
CREATE TYPE user_role AS ENUM ('passenger', 'driver');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
