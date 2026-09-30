-- A Tesla waiting for fares is still busy: it cannot open a second pool until this one completes.
-- A separate file because Postgres cannot use a new enum value in the transaction that added it.
DROP INDEX pools_one_active_per_vehicle;
CREATE UNIQUE INDEX pools_one_active_per_vehicle
  ON pools (vehicle_id)
  WHERE status IN ('accepted', 'driver_arrived', 'started', 'dropped_off');
