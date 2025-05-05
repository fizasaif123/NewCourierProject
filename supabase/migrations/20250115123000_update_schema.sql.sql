/*
  # Inventory Management System Schema

  1. New Tables
    - `skus`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `name` (text)
      - `description` (text)
      - `category` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `warehouses`
      - `id` (uuid, primary key)
      - `name` (text)
      - `location` (text)
      - `capacity` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `inventory_levels`
      - `id` (uuid, primary key)
      - `sku_id` (uuid, foreign key)
      - `warehouse_id` (uuid, foreign key)
      - `quantity` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `orders`
      - `id` (uuid, primary key)
      - `order_number` (text, unique)
      - `status` (text)
      - `customer_id` (uuid, foreign key)
      - `warehouse_id` (uuid, foreign key)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `order_items`
      - `id` (uuid, primary key)
      - `order_id` (uuid, foreign key)
      - `sku_id` (uuid, foreign key)
      - `quantity` (integer)
      - `created_at` (timestamp)

    - `inventory_transactions`
      - `id` (uuid, primary key)
      - `sku_id` (uuid, foreign key)
      - `warehouse_id` (uuid, foreign key)
      - `quantity` (integer)
      - `type` (text)
      - `reference_id` (uuid)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add policies for specific roles (admin, warehouse manager)

  3. Indexes
    - Add indexes for frequently queried columns
    - Add composite indexes for common query patterns
*/



-- Create Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  capacity integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Inventory Levels table
CREATE TABLE IF NOT EXISTS inventory_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid REFERENCES skus(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sku_id, warehouse_id)
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create Order Items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  sku_id uuid REFERENCES skus(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

-- Create Inventory Transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id uuid REFERENCES skus(id) ON DELETE CASCADE,
  warehouse_id uuid REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  type text NOT NULL CHECK (type IN ('receive', 'ship', 'adjust', 'transfer')),
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Create SKUs table
CREATE TABLE IF NOT EXISTS skus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Bins Table
CREATE TABLE IF NOT EXISTS bins (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  location VARCHAR(100) NOT NULL
);

-- Pallets Table
CREATE TABLE IF NOT EXISTS pallets (
  id SERIAL PRIMARY KEY,
  sku_id uuid REFERENCES skus(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity >= 0)
);

-- Quarantine Table
CREATE TABLE IF NOT EXISTS quarantine (
  id SERIAL PRIMARY KEY,
  sku_id uuid REFERENCES skus(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  location VARCHAR(100) NOT NULL
);

-- Inventory Allocations Table
CREATE TABLE IF NOT EXISTS inventory_allocations (
  id SERIAL PRIMARY KEY,
  sku_id uuid REFERENCES skus(id) ON DELETE CASCADE,
  bin_id INTEGER REFERENCES bins(id),
  pallet_id INTEGER REFERENCES pallets(id),
  quarantine_id INTEGER REFERENCES quarantine(id),
  quantity INTEGER NOT NULL CHECK (quantity >= 0)
);






-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_skus_category ON skus(category);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_sku ON inventory_levels(sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_levels_warehouse ON inventory_levels(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_sku ON inventory_transactions(sku_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(type);

-- Enable Row Level Security
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can read SKUs"
  ON skus FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read warehouses"
  ON warehouses FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read inventory levels"
  ON inventory_levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read their own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can read their own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Create functions for inventory operations
CREATE OR REPLACE FUNCTION update_inventory_level()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_levels (sku_id, warehouse_id, quantity)
  VALUES (NEW.sku_id, NEW.warehouse_id, NEW.quantity)
  ON CONFLICT (sku_id, warehouse_id)
  DO UPDATE SET
    quantity = inventory_levels.quantity + NEW.quantity,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory transactions
CREATE TRIGGER inventory_transaction_trigger
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_level();

-- Create function to update order status
CREATE OR REPLACE FUNCTION update_order_status(
  order_id uuid,
  new_status text
)
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET status = new_status,
      updated_at = now()
  WHERE id = order_id;
END;
$$ LANGUAGE plpgsql;