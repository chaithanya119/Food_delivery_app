USE railway;

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '🍽️'
);
INSERT IGNORE INTO categories (id,name,icon) VALUES
(1,'Tiffins','🥣'),(2,'Main Course','🍛'),(3,'Beverages','🥤');

CREATE TABLE IF NOT EXISTS menu_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  price DECIMAL(8,2) NOT NULL,
  is_veg TINYINT(1) DEFAULT 1,
  image_url VARCHAR(600),
  is_available TINYINT(1) DEFAULT 1,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);
INSERT IGNORE INTO menu_items (id,category_id,name,description,price,is_veg,image_url) VALUES
(1,1,'Idli Sambar','Soft steamed idlis with spicy sambar',60,1,'https://static.toiimg.com/thumb/115501753/115501753.jpg'),
(2,1,'Masala Dosa','Crispy dosa with spiced potato filling',80,1,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQijTni4jT4r4o3rdTvrnVKFHA49hd50wQo0w&s'),
(3,1,'Upma','Semolina breakfast with vegetables',50,1,'https://myfoodstory.com/wp-content/uploads/2022/11/Vegetable-Upma-3.jpg'),
(4,1,'Vada Sambar','Crispy medu vada with hot sambar',70,1,'https://www.sharmispassions.com/wp-content/uploads/2020/12/31788694212_f472703d61_o-475x500.jpg'),
(5,1,'Pongal','Rice & lentils with pepper & ghee',65,1,'https://spiceindiaonline.com/wp-content/uploads/2014/01/Ven-Pongal-3.jpg'),
(6,1,'Pesarattu','Green moong dal crepe',75,1,'https://www.masalakorb.com/wp-content/uploads/2019/06/Pesarattu-Preparation-V4.jpg'),
(7,2,'Hyderabadi Biryani','Aromatic basmati rice with spices',220,0,'https://vismaifood.com/storage/app/uploads/public/d86/3b2/d6d/thumb__700_0_0_0_auto.jpg'),
(8,2,'Veg Biryani','Fragrant rice with vegetables',160,1,'https://www.madhuseverydayindian.com/wp-content/uploads/2022/11/easy-vegetable-biryani.jpg'),
(9,2,'Rasam Rice','Tangy pepper rasam with rice',100,1,'https://mytastycurry.com/wp-content/uploads/2024/02/Pepper-rasam-recipe-featured.jpg'),
(10,2,'Curd Rice','Creamy yogurt rice',80,1,'https://www.indianveggiedelight.com/wp-content/uploads/2022/08/curd-rice-featured.jpg'),
(11,2,'Fish Curry + Rice','Coastal fish curry with rice',180,0,'https://greedy-panda.com/wp-content/uploads/2017/09/36_Goan-Fish-Curry-with-Basmati-Rice_001-1600x1600.jpg.webp'),
(12,2,'Paneer Butter Masala','Rich tomato gravy with paneer',150,1,'https://www.vegrecipesofindia.com/wp-content/uploads/2020/01/paneer-butter-masala-5.jpg'),
(13,3,'Filter Coffee','South Indian filter coffee',30,1,'https://www.sharmispassions.com/wp-content/uploads/2012/01/filter-coffee-recipe8.jpg'),
(14,3,'Mango Lassi','Chilled mango yogurt drink',60,1,'https://annikaeats.com/wp-content/uploads/2024/03/DSC_1071.jpg'),
(15,3,'Masala Chai','Spiced ginger tea',25,1,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ77qN95IL_ZpIb7rnbE6ohLFDkVYEnt1_0g&s'),
(16,3,'Buttermilk','Salted spiced buttermilk',20,1,'https://www.trulydesi.in/cdn/shop/articles/3_8a1a3548-3fa6-4fe2-9209-8a0e0ca96032.jpg');

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(200),
  address TEXT,
  pincode VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  customer_name VARCHAR(150) NOT NULL,
  customer_phone VARCHAR(20),
  delivery_address TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  gst_amount DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending','preparing','ready','delivered','cancelled') DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'cash',
  payment_status ENUM('pending','paid','failed') DEFAULT 'pending',
  txn_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  menu_item_id INT NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(8,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  customer_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  guest_count INT DEFAULT 2,
  booking_date DATE NOT NULL,
  booking_time VARCHAR(20) NOT NULL,
  special_notes TEXT,
  status ENUM('confirmed','cancelled','completed') DEFAULT 'confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(256) NOT NULL
);
INSERT IGNORE INTO admin_users (username,password_hash) VALUES ('admin','admin1234');

