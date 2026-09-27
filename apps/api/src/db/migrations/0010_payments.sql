-- One settlement per ride request. Amount is whole poisha (1 BDT = 100).
CREATE TYPE payment_method AS ENUM ('cash', 'teslapay');

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_request_id uuid NOT NULL UNIQUE REFERENCES ride_requests (id),
  amount_poisha integer NOT NULL,
  method payment_method NOT NULL,
  CONSTRAINT payments_amount_positive CHECK (amount_poisha > 0)
);
