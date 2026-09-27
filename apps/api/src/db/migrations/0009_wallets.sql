-- Simulated TeslaPay. 1 BDT = 100 poisha. Balance cannot go below zero.
CREATE TABLE wallets (
  user_id uuid PRIMARY KEY REFERENCES users (id),
  balance_poisha integer NOT NULL DEFAULT 0,
  CONSTRAINT wallets_balance_non_negative CHECK (balance_poisha >= 0)
);
