-- One Tesla per driver. Seat count is fixed and must be at least 1.
CREATE TABLE vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL UNIQUE REFERENCES users (id),
  name text NOT NULL,
  capacity smallint NOT NULL,
  CONSTRAINT vehicles_capacity_positive CHECK (capacity > 0),
  is_online boolean NOT NULL DEFAULT false
);
