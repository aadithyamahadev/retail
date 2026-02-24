-- PostgreSQL multi-tenant retail schema
-- Tenants own users, stores, products, sales, and forecasts.

CREATE TABLE tenants (
    id           BIGSERIAL PRIMARY KEY,
    name         TEXT        NOT NULL,
    slug         TEXT        NOT NULL UNIQUE,
    status       TEXT        NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    tenant_id      BIGINT      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email          TEXT        NOT NULL,
    auth_provider  TEXT        NOT NULL,
    auth_sub       TEXT        NOT NULL,
    role           TEXT        NOT NULL DEFAULT 'member',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email),
    UNIQUE (auth_provider, auth_sub)
);

CREATE TABLE stores (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    BIGINT      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code         TEXT        NOT NULL,
    name         TEXT        NOT NULL,
    city         TEXT,
    region       TEXT,
    status       TEXT        NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, code)
);

CREATE TABLE products (
    id           BIGSERIAL PRIMARY KEY,
    tenant_id    BIGINT      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sku          TEXT        NOT NULL,
    name         TEXT        NOT NULL,
    category     TEXT,
    status       TEXT        NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, sku)
);

CREATE TYPE sale_source AS ENUM ('photo', 'billing');

CREATE TABLE sales (
    id             BIGSERIAL PRIMARY KEY,
    tenant_id      BIGINT      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id       BIGINT      NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id     BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sale_timestamp TIMESTAMPTZ NOT NULL,
    quantity       NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount         NUMERIC(14,2) NOT NULL DEFAULT 0,
    source         sale_source NOT NULL,
    source_ref     TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE forecasts (
    id                 BIGSERIAL PRIMARY KEY,
    tenant_id          BIGINT      NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id           BIGINT      NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id         BIGINT      NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    target_date        DATE        NOT NULL,
    forecast_qty       NUMERIC(12,2) NOT NULL,
    forecast_conf_low  NUMERIC(12,2),
    forecast_conf_high NUMERIC(12,2),
    model_version      TEXT,
    generated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, store_id, product_id, target_date)
);

-- Indexes for tenant scoping and query performance
CREATE INDEX idx_users_tenant_email ON users (tenant_id, email);
CREATE INDEX idx_stores_tenant_code ON stores (tenant_id, code);
CREATE INDEX idx_products_tenant_sku ON products (tenant_id, sku);
CREATE INDEX idx_products_tenant_category ON products (tenant_id, category);
CREATE INDEX idx_sales_tenant_ts ON sales (tenant_id, sale_timestamp DESC);
CREATE INDEX idx_sales_store_ts ON sales (tenant_id, store_id, sale_timestamp DESC);
CREATE INDEX idx_sales_product_ts ON sales (tenant_id, product_id, sale_timestamp DESC);
CREATE INDEX idx_forecasts_target ON forecasts (tenant_id, store_id, product_id, target_date);
CREATE INDEX idx_forecasts_generated ON forecasts (tenant_id, generated_at DESC);
