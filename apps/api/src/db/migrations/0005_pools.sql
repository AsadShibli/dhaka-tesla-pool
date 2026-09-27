-- One shared ride. Only one live pool per Tesla. Finished pools stay as history.
CREATE TYPE pool_status AS ENUM (
  'accepted', 'driver_arrived', 'started', 'completed', 'cancelled'
);

CREATE TABLE pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles (id),
  driver_id uuid NOT NULL REFERENCES users (id),
  status pool_status NOT NULL DEFAULT 'accepted',
  capacity smallint NOT NULL,
  seats_taken smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pools_capacity_positive CHECK (capacity > 0),
  CONSTRAINT pools_seats_within_capacity CHECK (seats_taken >= 0 AND seats_taken <= capacity)
);

CREATE UNIQUE INDEX pools_one_active_per_vehicle
  ON pools (vehicle_id)
  WHERE status IN ('accepted', 'driver_arrived', 'started');
