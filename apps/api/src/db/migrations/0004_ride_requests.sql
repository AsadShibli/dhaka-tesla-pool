-- A passenger's request. fare_poisha is null until quoted (1 BDT = 100 poisha).
CREATE TYPE ride_status AS ENUM (
  'requested', 'matched', 'driver_arrived', 'started', 'completed', 'cancelled'
);

CREATE TABLE ride_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES users (id),
  pickup_code text NOT NULL REFERENCES areas (code),
  destination_code text NOT NULL REFERENCES areas (code),
  seats smallint NOT NULL,
  status ride_status NOT NULL DEFAULT 'requested',
  fare_poisha integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ride_requests_seats_positive CHECK (seats > 0),
  CONSTRAINT ride_requests_distinct_areas CHECK (pickup_code <> destination_code)
);
