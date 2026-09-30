-- Riders are at their drop-off but have not all paid. The trip completes only once everyone has.
ALTER TYPE ride_status ADD VALUE IF NOT EXISTS 'dropped_off' AFTER 'started';
ALTER TYPE pool_status ADD VALUE IF NOT EXISTS 'dropped_off' AFTER 'started';
