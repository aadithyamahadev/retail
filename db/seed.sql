INSERT INTO tenants (id, name, slug, status)
VALUES
  (1, 'Demo Retail Group', 'demo-retail-group', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT setval('tenants_id_seq', GREATEST((SELECT MAX(id) FROM tenants), 1));

INSERT INTO users (id, tenant_id, email, auth_provider, auth_sub, role)
VALUES
  (1, 1, 'owner@demoretail.com', 'demo-auth', 'owner-1', 'owner'),
  (2, 1, 'analyst@demoretail.com', 'demo-auth', 'analyst-1', 'member')
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', GREATEST((SELECT MAX(id) FROM users), 1));

INSERT INTO stores (id, tenant_id, code, name, city, region, status)
VALUES
  (1, 1, 'NYC-01', 'Downtown Flagship', 'New York', 'NY', 'active'),
  (2, 1, 'BOS-01', 'Boston Commons', 'Boston', 'MA', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT setval('stores_id_seq', GREATEST((SELECT MAX(id) FROM stores), 1));

INSERT INTO products (id, tenant_id, sku, name, category, status)
VALUES
  (1, 1, 'BEV-001', 'Sparkling Water 12oz', 'Beverages', 'active'),
  (2, 1, 'SNK-010', 'Protein Bar', 'Snacks', 'active'),
  (3, 1, 'HOM-022', 'Dish Soap 500ml', 'Home Care', 'active')
ON CONFLICT (id) DO NOTHING;

SELECT setval('products_id_seq', GREATEST((SELECT MAX(id) FROM products), 1));

INSERT INTO sales (tenant_id, store_id, product_id, sale_timestamp, quantity, amount, source, source_ref)
SELECT
  1,
  1,
  1,
  (CURRENT_DATE - (g.day || ' days')::interval) + interval '10 hours',
  18 + ((g.day % 6) * 2),
  (18 + ((g.day % 6) * 2)) * 1.99,
  'billing',
  'INV-NYC-BEV-' || g.day
FROM generate_series(1, 42) AS g(day);

INSERT INTO sales (tenant_id, store_id, product_id, sale_timestamp, quantity, amount, source, source_ref)
SELECT
  1,
  1,
  2,
  (CURRENT_DATE - (g.day || ' days')::interval) + interval '11 hours',
  11 + ((g.day % 4) * 3),
  (11 + ((g.day % 4) * 3)) * 2.49,
  'billing',
  'INV-NYC-SNK-' || g.day
FROM generate_series(1, 42) AS g(day);

INSERT INTO sales (tenant_id, store_id, product_id, sale_timestamp, quantity, amount, source, source_ref)
SELECT
  1,
  2,
  3,
  (CURRENT_DATE - (g.day || ' days')::interval) + interval '12 hours',
  7 + ((g.day % 5) * 2),
  (7 + ((g.day % 5) * 2)) * 4.75,
  'billing',
  'INV-BOS-HOM-' || g.day
FROM generate_series(1, 42) AS g(day);
