-- ============================================================
--  THE SPICY VENUE - Fix Migration (MySQL 5.7 & 8.0 compatible)
--  mysql -u root -p22KB1A0573 < database/fix_migration.sql
-- ============================================================

USE spicy_venue;

-- FIX 1: Allow password_hash to be NULL (OTP login doesn't use passwords)
ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL DEFAULT NULL;

-- FIX 2: Add missing address columns to users (safe procedure)
DROP PROCEDURE IF EXISTS fix_users_columns;
DELIMITER //
CREATE PROCEDURE fix_users_columns()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='street') THEN
    ALTER TABLE users ADD COLUMN street VARCHAR(200) AFTER address;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='plot_no') THEN
    ALTER TABLE users ADD COLUMN plot_no VARCHAR(50) AFTER street;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='pincode') THEN
    ALTER TABLE users ADD COLUMN pincode VARCHAR(10) AFTER plot_no;
  END IF;
END//
DELIMITER ;
CALL fix_users_columns();
DROP PROCEDURE IF EXISTS fix_users_columns;

-- FIX 3: Add missing columns to orders table (safe procedure, MySQL 5.7+)
DROP PROCEDURE IF EXISTS fix_orders_columns;
DELIMITER //
CREATE PROCEDURE fix_orders_columns()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='user_id') THEN
    ALTER TABLE orders ADD COLUMN user_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='customer_phone') THEN
    ALTER TABLE orders ADD COLUMN customer_phone VARCHAR(20) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='delivery_address') THEN
    ALTER TABLE orders ADD COLUMN delivery_address TEXT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='gst_amount') THEN
    ALTER TABLE orders ADD COLUMN gst_amount DECIMAL(10,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='payment_method') THEN
    ALTER TABLE orders ADD COLUMN payment_method VARCHAR(50) DEFAULT 'cash';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='payment_status') THEN
    ALTER TABLE orders ADD COLUMN payment_status ENUM('pending','paid','failed') DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders' AND COLUMN_NAME='txn_id') THEN
    ALTER TABLE orders ADD COLUMN txn_id VARCHAR(100) NULL;
  END IF;
END//
DELIMITER ;
CALL fix_orders_columns();
DROP PROCEDURE IF EXISTS fix_orders_columns;

-- FIX 4: Re-seed menu items if missing
INSERT IGNORE INTO categories (id,name,icon) VALUES
  (1,'Tiffins','🥣'),(2,'Main Course','🍛'),(3,'Beverages','🥤');

INSERT IGNORE INTO menu_items (id,category_id,name,description,price,is_veg,image_url,is_available) VALUES
(1,1,'Idli Sambar','Soft steamed idlis with spicy sambar',60,1,'https://static.toiimg.com/thumb/115501753/115501753.jpg',1),
(2,1,'Masala Dosa','Crispy dosa with spiced potato filling',80,1,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQijTni4jT4r4o3rdTvrnVKFHA49hd50wQo0w&s',1),
(3,1,'Upma','Semolina breakfast with vegetables',50,1,'https://myfoodstory.com/wp-content/uploads/2022/11/Vegetable-Upma-3.jpg',1),
(4,1,'Vada Sambar','Crispy medu vada with hot sambar',70,1,'https://www.sharmispassions.com/wp-content/uploads/2020/12/31788694212_f472703d61_o-475x500.jpg',1),
(5,1,'Pongal','Rice & lentils with pepper & ghee',65,1,'https://spiceindiaonline.com/wp-content/uploads/2014/01/Ven-Pongal-3.jpg',1),
(6,1,'Pesarattu','Green moong dal crepe',75,1,'https://www.masalakorb.com/wp-content/uploads/2019/06/Pesarattu-Preparation-V4.jpg',1),
(7,2,'Hyderabadi Biryani','Aromatic basmati rice with spices',220,0,'https://vismaifood.com/storage/app/uploads/public/d86/3b2/d6d/thumb__700_0_0_0_auto.jpg',1),
(8,2,'Veg Biryani','Fragrant rice with vegetables',160,1,'https://www.madhuseverydayindian.com/wp-content/uploads/2022/11/easy-vegetable-biryani.jpg',1),
(9,2,'Rasam Rice','Tangy pepper rasam with rice',100,1,'https://mytastycurry.com/wp-content/uploads/2024/02/Pepper-rasam-recipe-featured.jpg',1),
(10,2,'Curd Rice','Creamy yogurt rice',80,1,'https://www.indianveggiedelight.com/wp-content/uploads/2022/08/curd-rice-featured.jpg',1),
(11,2,'Fish Curry + Rice','Coastal fish curry with rice',180,0,'https://greedy-panda.com/wp-content/uploads/2017/09/36_Goan-Fish-Curry-with-Basmati-Rice_001-1600x1600.jpg.webp',1),
(12,2,'Paneer Butter Masala','Rich tomato gravy with paneer',150,1,'https://www.vegrecipesofindia.com/wp-content/uploads/2020/01/paneer-butter-masala-5.jpg',1),
(13,3,'Filter Coffee','South Indian filter coffee',30,1,'https://www.sharmispassions.com/wp-content/uploads/2012/01/filter-coffee-recipe8.jpg',1),
(14,3,'Mango Lassi','Chilled mango yogurt drink',60,1,'https://annikaeats.com/wp-content/uploads/2024/03/DSC_1071.jpg',1),
(15,3,'Masala Chai','Spiced ginger tea',25,1,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ77qN95IL_ZpIb7rnbE6ohLFDkVYEnt1_0g&s',1),
(16,3,'Buttermilk','Salted spiced buttermilk',20,1,'https://www.trulydesi.in/cdn/shop/articles/3_8a1a3548-3fa6-4fe2-9209-8a0e0ca96032.jpg?v=1758521132',1);

-- FIX 5: Ensure all menu items are marked available
UPDATE menu_items SET is_available = 1 WHERE is_available IS NULL OR is_available = 0;

SELECT 'Migration complete! All columns added.' AS status;
