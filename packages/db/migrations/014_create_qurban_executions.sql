-- Create qurban_executions table
CREATE TABLE IF NOT EXISTS qurban_executions (
  id TEXT PRIMARY KEY NOT NULL,
  execution_number TEXT UNIQUE NOT NULL,
  shared_group_id TEXT REFERENCES qurban_shared_groups(id),
  order_id TEXT REFERENCES qurban_orders(id),
  execution_date TIMESTAMP(3) NOT NULL,
  location TEXT NOT NULL,
  butcher_name TEXT,
  animal_type TEXT NOT NULL,
  animal_weight DECIMAL(10,2),
  animal_condition TEXT,
  distribution_method TEXT,
  distribution_notes TEXT,
  photos TEXT,
  video_url TEXT,
  recipient_count INTEGER,
  recipient_list TEXT,
  executed_by TEXT REFERENCES users(id),
  created_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP(3) DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_animal_type CHECK (animal_type IN ('cow', 'goat')),
  CONSTRAINT valid_distribution CHECK (distribution_method IN ('direct_pickup', 'distribution', 'donation') OR distribution_method IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_qurban_executions_group ON qurban_executions(shared_group_id);
CREATE INDEX IF NOT EXISTS idx_qurban_executions_order ON qurban_executions(order_id);
