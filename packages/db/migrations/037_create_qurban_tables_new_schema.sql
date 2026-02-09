-- Create qurban tables with new schema structure

-- 1. Qurban Periods Table
CREATE TABLE IF NOT EXISTS qurban_periods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hijri_year TEXT NOT NULL,
  gregorian_year INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  execution_date TEXT NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Qurban Packages Table (Master packages without period_id)
CREATE TABLE IF NOT EXISTS qurban_packages (
  id TEXT PRIMARY KEY,
  animal_type TEXT NOT NULL,
  package_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  max_slots INTEGER,
  is_available BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 3. Qurban Package Periods Junction Table (Many-to-many)
CREATE TABLE IF NOT EXISTS qurban_package_periods (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES qurban_packages(id),
  period_id TEXT NOT NULL REFERENCES qurban_periods(id),
  price INTEGER NOT NULL,
  stock INTEGER DEFAULT 0 NOT NULL,
  stock_sold INTEGER DEFAULT 0 NOT NULL,
  slots_filled INTEGER DEFAULT 0 NOT NULL,
  is_available BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE(package_id, period_id)
);

-- 4. Qurban Shared Groups Table
CREATE TABLE IF NOT EXISTS qurban_shared_groups (
  id TEXT PRIMARY KEY,
  package_id TEXT REFERENCES qurban_packages(id),
  package_period_id TEXT REFERENCES qurban_package_periods(id),
  group_number INTEGER NOT NULL,
  max_slots INTEGER NOT NULL,
  slots_filled INTEGER DEFAULT 0 NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 5. Qurban Orders Table
CREATE TABLE IF NOT EXISTS qurban_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  user_id TEXT,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  package_id TEXT REFERENCES qurban_packages(id),
  package_period_id TEXT REFERENCES qurban_package_periods(id),
  shared_group_id TEXT REFERENCES qurban_shared_groups(id),
  quantity INTEGER DEFAULT 1 NOT NULL,
  unit_price INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'full' NOT NULL,
  payment_method_id TEXT,
  payment_status TEXT DEFAULT 'pending' NOT NULL,
  payment_reference TEXT,
  paid_amount INTEGER DEFAULT 0 NOT NULL,
  installment_frequency TEXT,
  installment_count INTEGER,
  installment_amount INTEGER,
  order_status TEXT DEFAULT 'pending' NOT NULL,
  on_behalf_of TEXT,
  notes TEXT,
  metadata TEXT,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  confirmed_at TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 6. Qurban Payments Table
CREATE TABLE IF NOT EXISTS qurban_payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL REFERENCES qurban_orders(id),
  amount INTEGER NOT NULL,
  payment_method TEXT NOT NULL,
  payment_channel TEXT,
  installment_number INTEGER,
  payment_proof TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT,
  verified_at TIMESTAMP,
  verified_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. Qurban Savings Table
CREATE TABLE IF NOT EXISTS qurban_savings (
  id TEXT PRIMARY KEY,
  savings_number TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  donor_name TEXT NOT NULL,
  donor_email TEXT,
  donor_phone TEXT,
  target_period_id TEXT NOT NULL REFERENCES qurban_periods(id),
  target_package_period_id TEXT REFERENCES qurban_package_periods(id),
  target_package_id TEXT REFERENCES qurban_packages(id),
  target_amount INTEGER NOT NULL,
  current_amount INTEGER DEFAULT 0 NOT NULL,
  installment_frequency TEXT,
  installment_count INTEGER,
  installment_amount INTEGER,
  installment_day INTEGER,
  status TEXT DEFAULT 'active' NOT NULL,
  start_date TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  converted_at TIMESTAMP,
  converted_to_order_id TEXT REFERENCES qurban_orders(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. Qurban Savings Transactions Table
CREATE TABLE IF NOT EXISTS qurban_savings_transactions (
  id TEXT PRIMARY KEY,
  transaction_number TEXT UNIQUE NOT NULL,
  savings_id TEXT NOT NULL REFERENCES qurban_savings(id),
  amount INTEGER NOT NULL,
  transaction_type TEXT DEFAULT 'deposit' NOT NULL,
  payment_method TEXT,
  payment_channel TEXT,
  payment_proof TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  notes TEXT,
  verified_at TIMESTAMP,
  verified_by TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 9. Qurban Executions Table
CREATE TABLE IF NOT EXISTS qurban_executions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES qurban_orders(id),
  shared_group_id TEXT REFERENCES qurban_shared_groups(id),
  animal_tag TEXT,
  animal_weight REAL,
  slaughter_date TIMESTAMP NOT NULL,
  location TEXT,
  officer_name TEXT,
  notes TEXT,
  photo_url TEXT,
  video_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
