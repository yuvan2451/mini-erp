-- ============================================
-- MINI ERP + CRM DATABASE SCHEMA
-- ============================================

-- Users and roles
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Customers
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(150) NOT NULL,
    mobile VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    business_name VARCHAR(150),
    gst_number VARCHAR(20),
    customer_type VARCHAR(20) NOT NULL
        CHECK (customer_type IN ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR')),
    address TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'LEAD'
        CHECK (status IN ('LEAD', 'ACTIVE', 'INACTIVE')),
    follow_up_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- CRM follow-up history
CREATE TABLE follow_ups (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL
        REFERENCES customers(id) ON DELETE CASCADE,
    follow_up_date DATE NOT NULL,
    note TEXT NOT NULL,
    created_by INTEGER NOT NULL
        REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Products
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL
        CHECK (unit_price >= 0),
    current_stock INTEGER NOT NULL DEFAULT 0
        CHECK (current_stock >= 0),
    minimum_stock_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (minimum_stock_quantity >= 0),
    warehouse_location VARCHAR(150) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Stock movement history
CREATE TABLE stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL
        REFERENCES products(id),
    quantity INTEGER NOT NULL
        CHECK (quantity > 0),
    movement_type VARCHAR(10) NOT NULL
        CHECK (movement_type IN ('IN', 'OUT')),
    reason VARCHAR(255) NOT NULL,
    created_by INTEGER NOT NULL
        REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Sales challans
CREATE TABLE challans (
    id SERIAL PRIMARY KEY,
    challan_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INTEGER NOT NULL
        REFERENCES customers(id),
    total_quantity INTEGER NOT NULL DEFAULT 0
        CHECK (total_quantity >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    created_by INTEGER NOT NULL
        REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Products inside a challan
-- Snapshot fields preserve historical information.
CREATE TABLE challan_items (
    id SERIAL PRIMARY KEY,
    challan_id INTEGER NOT NULL
        REFERENCES challans(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL
        REFERENCES products(id),
    product_name VARCHAR(150) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    quantity INTEGER NOT NULL
        CHECK (quantity > 0),
    total_price NUMERIC(12, 2) NOT NULL
        CHECK (total_price >= 0)
);


-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_customers_name
    ON customers(customer_name);

CREATE INDEX idx_customers_mobile
    ON customers(mobile);

CREATE INDEX idx_products_name
    ON products(product_name);

CREATE INDEX idx_products_sku
    ON products(sku);

CREATE INDEX idx_stock_movements_product
    ON stock_movements(product_id);

CREATE INDEX idx_challans_customer
    ON challans(customer_id);

CREATE INDEX idx_challan_items_challan
    ON challan_items(challan_id);

CREATE INDEX idx_follow_ups_customer
    ON follow_ups(customer_id);