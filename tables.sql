#Users
CREATE TABLE Users (
user_id INT AUTO_INCREMENT PRIMARY KEY,
username VARCHAR(255) NOT NULL,
email VARCHAR(255) NOT NULL UNIQUE,
password_hash VARCHAR(255) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

#Records
CREATE TABLE Records (
record_id INT AUTO_INCREMENT PRIMARY KEY,
external_id VARCHAR(255) NOT NULL,
title VARCHAR(255) NOT NULL,
artist VARCHAR(255) NOT NULL,
genre VARCHAR(255),
release_date DATE,
label VARCHAR(255),
thumbnail_url VARCHAR(500),
last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
UNIQUE INDEX idx_external_id (external_id)
);

#UserRecords
CREATE TABLE UserRecords (
user_record_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
record_id INT NOT NULL,
list_type ENUM('wishlist', 'mylist') NOT NULL,
added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES Users(user_id),
FOREIGN KEY (record_id) REFERENCES Records(record_id),
UNIQUE INDEX idx_user_record (user_id, record_id, list_type)
);

#SearchHistory
CREATE TABLE SearchHistory (
search_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
search_query VARCHAR(255),
search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

#Wishlist
CREATE TABLE Wishlist (
wishlist_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
record_id INT NOT NULL,
added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES Users(user_id),
FOREIGN KEY (record_id) REFERENCES Records(record_id)
);

#Reviews
CREATE TABLE Reviews (
review_id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT NOT NULL,
record_id INT NOT NULL,
rating TINYINT CHECK (rating BETWEEN 1 AND 5),
comment TEXT,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES Users(user_id),
FOREIGN KEY (record_id) REFERENCES Records(record_id)
);