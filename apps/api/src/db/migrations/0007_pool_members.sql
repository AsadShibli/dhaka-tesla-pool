-- One passenger in a shared ride. fare_poisha is that passenger's fare only.
CREATE TABLE pool_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES pools (id),
  ride_request_id uuid NOT NULL UNIQUE REFERENCES ride_requests (id),
  passenger_id uuid NOT NULL REFERENCES users (id),
  seats smallint NOT NULL,
  fare_poisha integer NOT NULL,
  CONSTRAINT pool_members_seats_positive CHECK (seats > 0)
);
