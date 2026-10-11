USE farmconnect;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE favorites;
TRUNCATE TABLE product_notes;
TRUNCATE TABLE inquiries;
TRUNCATE TABLE orders;
TRUNCATE TABLE products;
TRUNCATE TABLE product_categories;
TRUNCATE TABLE buyer_profiles;
TRUNCATE TABLE farmer_profiles;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

-- Every sample account uses the password: password123
INSERT INTO users (id, full_name, email, phone, password, role, status) VALUES
(1, 'FarmConnect Admin', 'admin@farmconnect.test', '+256700000001', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'admin', 'active'),
(2, 'Sarah Namusoke', 'farmer1@farmconnect.test', '+256700000002', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'farmer', 'active'),
(3, 'Peter Okello', 'farmer2@farmconnect.test', '+256700000003', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'farmer', 'active'),
(4, 'Grace Auma', 'farmer3@farmconnect.test', '+256700000004', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'farmer', 'active'),
(5, 'Daniel Kato', 'buyer1@farmconnect.test', '+256700000005', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'buyer', 'active'),
(6, 'Miriam Atim', 'buyer2@farmconnect.test', '+256700000006', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'buyer', 'active'),
(7, 'Joshua Muwanga', 'buyer3@farmconnect.test', '+256700000007', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'buyer', 'active'),
(8, 'Agnes Nankya', 'buyer4@farmconnect.test', '+256700000008', '$2b$10$L9fzOpqxx/m3Ulcowil3NeTk8/GnCHsj29oy.LKPlOToq67TH8EpS', 'buyer', 'active');

select * from users;
INSERT INTO farmer_profiles (user_id, farm_name, farm_description, district, subcounty, village, address) VALUES
(2, 'Namusoke Fresh Farm', 'Mixed crop farm supplying maize, beans, and vegetables.', 'Wakiso', 'Nangabo', 'Kiteezi', 'Kiteezi trading center'),
(3, 'Okello Northern Produce', 'Family farm focused on grains and poultry.', 'Gulu', 'Laroo', 'Pece', 'Near Gulu market'),
(4, 'Auma Highlands Farm', 'Coffee, matooke, and fruit farm with seasonal harvests.', 'Mbale', 'Wanale', 'Buwalasi', 'Wanale road');

INSERT INTO buyer_profiles (user_id, buyer_type, business_name, district, address) VALUES
(5, 'Retailer', 'Kato Food Store', 'Kampala', 'Nakasero market'),
(6, 'Restaurant', 'Atim Kitchen Supplies', 'Jinja', 'Main Street'),
(7, 'Wholesaler', 'Muwanga Produce Traders', 'Wakiso', 'Gayaza road'),
(8, 'Individual', NULL, 'Mukono', 'Seeta');

INSERT INTO product_categories (id, name, description, status) VALUES
(1, 'Maize', 'Fresh and dry maize grain.', 'active'),
(2, 'Beans', 'Different bean varieties for home and commercial buyers.', 'active'),
(3, 'Matooke', 'Green bananas and banana bunches.', 'active'),
(4, 'Coffee', 'Arabica and Robusta coffee beans.', 'active'),
(5, 'Milk', 'Fresh dairy milk.', 'active'),
(6, 'Poultry', 'Chicken, eggs, and other poultry products.', 'active'),
(7, 'Vegetables', 'Leafy greens, tomatoes, onions, and garden vegetables.', 'active'),
(8, 'Fruits', 'Seasonal fruits from local farms.', 'active');

INSERT INTO products (id, farmer_id, category_id, product_name, description, quantity, unit, price_per_unit, district, location_details, image, harvest_date, availability_status) VALUES
(1, 2, 1, 'Dry Maize Grain', 'Clean dry maize packed in 100 kg sacks.', 50, '100 kg sack', 145000, 'Wakiso', 'Pickup from Kiteezi farm gate', NULL, '2026-06-01', 'available'),
(2, 2, 2, 'Nambale Beans', 'Sorted Nambale beans ready for wholesale buyers.', 30, '50 kg sack', 180000, 'Wakiso', 'Delivery within Kampala can be arranged', NULL, '2026-05-28', 'available'),
(3, 2, 7, 'Fresh Tomatoes', 'Firm red tomatoes harvested this week.', 200, 'crate', 45000, 'Wakiso', 'Nangabo collection point', NULL, '2026-06-14', 'available'),
(4, 3, 1, 'White Maize', 'Good quality maize for milling.', 80, '100 kg sack', 138000, 'Gulu', 'Pece division store', NULL, '2026-05-20', 'available'),
(5, 3, 6, 'Local Chicken Eggs', 'Tray of 30 local chicken eggs.', 120, 'tray', 16000, 'Gulu', 'Laroo farm', NULL, '2026-06-16', 'available'),
(6, 3, 6, 'Broiler Chicken', 'Healthy broilers averaging 1.8 kg.', 70, 'bird', 23000, 'Gulu', 'Farm pickup preferred', NULL, '2026-06-10', 'available'),
(7, 4, 4, 'Arabica Coffee Beans', 'Sun-dried Arabica coffee from the Mbale highlands.', 25, '60 kg bag', 420000, 'Mbale', 'Buwalasi collection center', NULL, '2026-05-30', 'available'),
(8, 4, 3, 'Matooke Bunches', 'Medium and large matooke bunches.', 90, 'bunch', 25000, 'Mbale', 'Wanale road farm', NULL, '2026-06-12', 'available'),
(9, 4, 8, 'Passion Fruits', 'Fresh purple passion fruits.', 60, 'crate', 55000, 'Mbale', 'Delivery to Mbale town available', NULL, '2026-06-15', 'available'),
(10, 2, 5, 'Fresh Cow Milk', 'Morning milk delivered chilled.', 100, 'liter', 2500, 'Wakiso', 'Daily pickup before 10 AM', NULL, '2026-06-17', 'available');

INSERT INTO orders (buyer_id, farmer_id, product_id, quantity_requested, total_estimated_price, delivery_option, buyer_message, status) VALUES
(5, 2, 1, 5, 725000, 'pickup', 'I can pick up on Saturday morning.', 'pending'),
(6, 4, 8, 10, 250000, 'delivery', 'Please confirm delivery cost to Jinja.', 'accepted'),
(7, 3, 4, 12, 1656000, 'pickup', 'Need maize for milling next week.', 'pending'),
(8, 2, 10, 20, 50000, 'delivery', 'Can you deliver to Seeta?', 'completed');

INSERT INTO inquiries (buyer_id, farmer_id, product_id, message, status) VALUES
(5, 2, 2, 'Are the beans sorted by size?', 'open'),
(6, 4, 7, 'Do you have a recent moisture content reading?', 'answered'),
(7, 3, 5, 'Can you supply 200 trays weekly?', 'open'),
(8, 4, 9, 'Are passion fruits available tomorrow morning?', 'closed');

INSERT INTO favorites (buyer_id, product_id) VALUES
(5, 1),
(5, 2),
(6, 7),
(7, 4);

INSERT INTO product_notes (buyer_id, product_id, note_text) VALUES
(5, 1, 'Need the maize delivered before Saturday morning.'),
(6, 7, 'Ask about moisture before final purchase.'),
(7, 5, 'Follow up on egg supply and weekly pricing.');

INSERT INTO audit_logs (user_id, action, details) VALUES
(1, 'seed_data_loaded', '{"source":"database/seed.sql"}'),
(5, 'buyer_login', '{"email":"buyer1@farmconnect.test"}'),
(2, 'product_listed', '{"product_id":1,"product_name":"Dry Maize Grain"}');