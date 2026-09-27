-- Empty while the passenger is waiting. Set when a driver accepts them into a pool.
ALTER TABLE ride_requests
  ADD COLUMN pool_id uuid REFERENCES pools (id);

CREATE INDEX ride_requests_pool_id_idx ON ride_requests (pool_id);
