-- Append-only log. from_status is empty on the first event for a ride.
CREATE TABLE ride_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES users (id),
  pool_id uuid REFERENCES pools (id),
  ride_request_id uuid REFERENCES ride_requests (id),
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ride_events_has_subject CHECK (pool_id IS NOT NULL OR ride_request_id IS NOT NULL)
);

CREATE INDEX ride_events_pool_id_idx ON ride_events (pool_id);
CREATE INDEX ride_events_ride_request_id_idx ON ride_events (ride_request_id);
