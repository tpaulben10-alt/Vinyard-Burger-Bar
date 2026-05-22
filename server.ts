import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import { User, MenuItem, Order, Feedback, OrderItem } from "./src/types";

// MySQL Database Connection Pool (Lazy Initialization)
let pool: mysql.Pool | null = null;

function getPool(): mysql.Pool {
  if (!pool) {
    const host = process.env.DB_HOST;
    if (!host) {
      throw new Error("DB_HOST environment variable is missing. Please set your Aiven MySQL Host in AI Studio settings.");
    }
    
    pool = mysql.createPool({
      host: host,
      port: parseInt(process.env.DB_PORT || "16587"),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: false, // For Aiven, usually enough to just enable SSL
      },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

async function initDB() {
  try {
    const connection = await getPool().getConnection();
    console.log("Connected to Aiven MySQL database");

    // Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        loyaltyPoints INT DEFAULT 0,
        isOnline BOOLEAN DEFAULT FALSE,
        address TEXT,
        lat DOUBLE,
        lng DOUBLE
      )
    `);

    // Orders Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        userId VARCHAR(255),
        customerName VARCHAR(255),
        subtotal DECIMAL(10, 2),
        deliveryFee DECIMAL(10, 2),
        distance DECIMAL(10, 2),
        total DECIMAL(10, 2),
        status VARCHAR(50),
        createdAt DATETIME,
        estimatedMinutes INT,
        paymentMethod VARCHAR(50),
        address TEXT,
        lat DOUBLE,
        lng DOUBLE,
        rating INT,
        feedback TEXT,
        deliveryInstructions TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
      )
    `);

    // Order Items Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId VARCHAR(255),
        menuItemId VARCHAR(255),
        name VARCHAR(255),
        price DECIMAL(10, 2),
        qty INT,
        customizations JSON,
        FOREIGN KEY (orderId) REFERENCES orders(id)
      )
    `);

    // Status History Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderId VARCHAR(255),
        status VARCHAR(50),
        timestamp DATETIME,
        FOREIGN KEY (orderId) REFERENCES orders(id)
      )
    `);

    // Feedbacks Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id VARCHAR(255) PRIMARY KEY,
        customerName VARCHAR(255),
        rating INT,
        comment TEXT,
        createdAt DATETIME
      )
    `);

    connection.release();
    console.log("Database schema initialized successfully");
  } catch (err) {
    console.error("Failed to initialize database:", err);
  }
}

// Database storage setup (Legacy support for db.json if needed, but we'll focus on MySQL)
const DB_FILE = path.join(process.cwd(), "db.json");

interface DBStore {
  users: User[];
  orders: Order[];
  feedbacks: Feedback[];
}

const INITIAL_MENU: MenuItem[] = [
  // === BURGERS ===
  {
    id: "burger-classic",
    name: "Vinyard Classic Burger",
    description: "Home-made pure beef patty topped with cheddar cheese sauce, fresh lettuce, onions, and our signature Vinyard burger sauce.",
    price: 175.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "burger-cheese",
    name: "Vinyard Cheese Burger",
    description: "Home-made pure beef patty topped with sliced cheese & cheddar cheese sauce, caramelized onions, fresh lettuce, fresh tomato and our signature Vinyard burger sauce.",
    price: 185.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1571066811602-71683a3f680d?w=600&auto=format&fit=crop&q=80",
    signature: true,
    popular: true
  },
  {
    id: "burger-chefs-choice",
    name: "Chef's Choice Burger",
    description: "Home-made pure beef patty topped with bacon, sliced cheese, onions, fresh lettuce, fresh tomato, and our signature Vinyard sauce.",
    price: 215.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&auto=format&fit=crop&q=80",
    signature: true
  },
  {
    id: "burger-double-cc",
    name: "Double CC Burger",
    description: "Double home-made beef patties topped with bacon, sliced cheese, onions, fresh lettuce, fresh tomato, and our signature Vinyard sauce.",
    price: 295.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&auto=format&fit=crop&q=80",
    newArrival: true
  },
  {
    id: "burger-bacon-bbq",
    name: "Bacon BBQ Burger",
    description: "Home-made beef patty topped with bacon, sliced cheese, fresh lettuce, fresh tomato, onions, garlic aioli, and BBQ sauce.",
    price: 215.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1594212699903-ec8a3cee50f6?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "burger-blt",
    name: "BLT Burger",
    description: "Home-made beef patty loaded with bacon, sliced cheese & cheddar sauce, fresh lettuce, fresh tomato, and our signature Vinyard sauce.",
    price: 215.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1521305916504-4a1121188589?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "burger-double-blt",
    name: "Double BLT Burger",
    description: "Double home-made beef patty loaded with bacon, sliced cheese & cheddar sauce, fresh lettuce, fresh tomato, and our signature Vinyard sauce.",
    price: 295.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "burger-hawaiian-bbq",
    name: "Hawaiian BBQ Burger",
    description: "Home-made beef patty topped with sweet pineapple, sliced cheese, fresh tomato, caramelized onions, lettuce, garlic aioli, and BBQ sauce.",
    price: 185.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1582196016295-f8c894d37922?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "burger-titan-ultimate",
    name: "Titan Ultimate Burger",
    description: "Triple layer home-made beef patties loaded with 3 cheese slices, bacon, cheddar cheese sauce, caramelized onions, fresh lettuce, tomato, and our signature Vinyard sauce.",
    price: 379.00,
    category: "burgers",
    imageUrl: "https://images.unsplash.com/photo-1603060262583-f3e37f4e76b3?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },

  // === PASTA ===
  {
    id: "pasta-carbonara",
    name: "Classic Spaghetti Carbonara",
    description: "Creamy classic spaghetti carbonara served with poached egg and garlic bread.",
    price: 195.00,
    category: "pasta",
    imageUrl: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "pasta-asian-chicken",
    name: "Asian Chicken Pasta",
    description: "Sweet and spicy Asian-style pasta with tender chicken and mushrooms, served with garlic bread.",
    price: 185.00,
    category: "pasta",
    imageUrl: "https://images.unsplash.com/photo-1546548970-71785318a17b?w=600&auto=format&fit=crop&q=80",
    newArrival: true
  },
  {
    id: "pasta-pinoy-spaghetti",
    name: "Pinoy Style Spaghetti",
    description: "Sweet-style Filipino spaghetti topped with hotdogs and grated cheese, served with garlic bread.",
    price: 175.00,
    category: "pasta",
    imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "pasta-fettuccine-bolognese",
    name: "Fettuccine Bolognese",
    description: "Fettuccine pasta in rich savory Bolognese sauce, topped with parmesan cheese and basil oil, served with garlic bread.",
    price: 195.00,
    category: "pasta",
    imageUrl: "https://images.unsplash.com/photo-1598866594230-a7e1910bc31b?w=600&auto=format&fit=crop&q=80",
    signature: true
  },
  {
    id: "pasta-chicken-alfredo",
    name: "Fettuccine Chicken Alfredo",
    description: "Fettuccine pasta in creamy Alfredo sauce with chicken tenders, served with garlic bread.",
    price: 185.00,
    category: "pasta",
    imageUrl: "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=600&auto=format&fit=crop&q=80",
    popular: true
  },
  {
    id: "pasta-ham-mushroom",
    name: "Creamy Ham & Mushroom Fettuccine",
    description: "Fettuccine pasta in creamy parmesan sauce with ham and mushrooms, served with garlic bread.",
    price: 185.00,
    category: "pasta",
    imageUrl: "https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=600&auto=format&fit=crop&q=80"
  },

  // === SIDES / APPETIZERS ===
  {
    id: "sides-french-fries-solo",
    name: "Classic French Fries (Solo)",
    description: "Golden crispy fries, perfectly spiced, served with tomato ketchup dip. Solo portion.",
    price: 85.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "sides-french-fries-sharing",
    name: "Classic French Fries (Sharing)",
    description: "Golden crispy fries, perfectly spiced, served with tomato ketchup dip. Sharing portion.",
    price: 165.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "sides-cheese-fries-solo",
    name: "Cheese Fries (Solo)",
    description: "Crispy fries topped with creamy cheddar cheese sauce, served with BBQ dip. Solo portion.",
    price: 95.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "sides-cheese-fries-sharing",
    name: "Cheese Fries (Sharing)",
    description: "Crispy fries topped with creamy cheddar cheese sauce, served with BBQ dip. Sharing portion.",
    price: 185.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1600957137473-c1a1e225e7e3?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "sides-mozzarella-solo",
    name: "Mozzarella Sticks (Solo)",
    description: "Creamy mozzarella coated in herbed breadcrumbs, crispy golden, served with BBQ dip. Solo portion.",
    price: 145.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "sides-mozzarella-sharing",
    name: "Mozzarella Sticks (Sharing)",
    description: "Creamy mozzarella coated in herbed breadcrumbs, crispy golden, served with BBQ dip. Sharing portion.",
    price: 285.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1531749668029-2db88e4b76ce?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "sides-nacho-fries",
    name: "Nacho Fries",
    description: "Crispy fries loaded with mango salsa, chilli con carne, sour cream and cheddar cheese sauce. Sharing portion.",
    price: 249.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1513456852971-30c0b81c9d23?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "sides-pulled-pork-fries",
    name: "Pulled Pork BBQ Fries",
    description: "Crispy fries topped with tender BBQ pulled pork, finished with lemon garlic aioli. Sharing portion.",
    price: 249.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=600&auto=format&fit=crop&q=80",
    signature: true
  },
  {
    id: "sides-wedges-garlic-parm",
    name: "Garlic Parmesan Wedges",
    description: "Homemade potato wedges tossed with garlic oil, parmesan cheese and fried garlic, served with lemon garlic aioli.",
    price: 175.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "sides-wedges-vinyard",
    name: "Vinyard Style Potato Wedges",
    description: "Homemade potato wedges topped with parmesan cheese, bacon bits and our signature Vinyard sauce.",
    price: 195.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80",
    signature: true
  },
  {
    id: "sides-wedges-salted-egg",
    name: "Spicy Salted Egg Wedges",
    description: "Homemade potato wedges coated in rich spicy salted egg, served with creamy sour cream.",
    price: 185.00,
    category: "sides",
    imageUrl: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&auto=format&fit=crop&q=80"
  },

  // === RICE MEALS ===
  {
    id: "rice-burger-steak",
    name: "Sizzling Burger Steak with Egg",
    description: "Homemade beef patties smothered in rich mushroom gravy, served hot with rice.",
    price: 145.00,
    category: "rice-meals",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "rice-luncheon-meat",
    name: "Sizzling Luncheon Meat with Egg",
    description: "Three slices of savory luncheon meat with sunny side-up egg, drizzled with teriyaki sauce, served hot with rice.",
    price: 125.00,
    category: "rice-meals",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "rice-pulled-pork",
    name: "Pulled Pork BBQ with Egg",
    description: "Savory BBQ pulled pork with sunny side up egg, served hot with rice.",
    price: 145.00,
    category: "rice-meals",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "rice-pork-belly",
    name: "Smoked BBQ Pork Belly",
    description: "Savory smoked BBQ pork belly, served hot with rice.",
    price: 185.00,
    category: "rice-meals",
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80",
    signature: true
  },
  {
    id: "rice-hungarian-sausage",
    name: "Sizzling Hungarian Sausage with Egg",
    description: "Juicy Hungarian sausage with sunny side up egg and gravy, served hot with rice.",
    price: 125.00,
    category: "rice-meals",
    imageUrl: "https://images.unsplash.com/photo-1532242718418-1712608277e5?w=600&auto=format&fit=crop&q=80"
  },

  // === FLAVORED CHICKEN ===
  {
    id: "chicken-3pcs",
    name: "Flavored Fried Chicken (3 Pieces)",
    description: "3 Pieces of Flavored Fried Chicken. Choose flavor: Classic, Garlic Parmesan, Ranch BBQ, Sweet Chilli, or Spicy Sriracha Mayo.",
    price: 175.00,
    category: "chicken",
    imageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "chicken-6pcs",
    name: "Flavored Fried Chicken (6 Pieces)",
    description: "6 Pieces of Flavored Fried Chicken. Choose flavor: Classic, Garlic Parmesan, Ranch BBQ, Sweet Chilli, or Spicy Sriracha Mayo.",
    price: 350.00,
    category: "chicken",
    imageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "chicken-9pcs",
    name: "Flavored Fried Chicken (9 Pieces)",
    description: "9 Pieces of Flavored Fried Chicken. Choose flavor: Classic, Garlic Parmesan, Ranch BBQ, Sweet Chilli, or Spicy Sriracha Mayo.",
    price: 515.00,
    category: "chicken",
    imageUrl: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "chicken-meal-solo",
    name: "Flavored Chicken w/ drinks (Solo)",
    description: "Served with Rice or Fries and cold drink. Choose flavor: Classic, Garlic Parmesan, Ranch BBQ, Sweet Chilli, or Spicy Sriracha Mayo.",
    price: 165.00,
    category: "chicken",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "chicken-meal-double",
    name: "Flavored Chicken w/ drinks (Double)",
    description: "Served with Rice or Fries and cold drink. Double portion. Choose flavor: Classic, Garlic Parmesan, Ranch BBQ, Sweet Chilli, or Spicy Sriracha Mayo.",
    price: 310.00,
    category: "chicken",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "chicken-meal-family",
    name: "Flavored Chicken w/ drinks (Family)",
    description: "Served with Rice or Fries and cold drink. Family serving. Choose flavor: Classic, Garlic Parmesan, Ranch BBQ, Sweet Chilli, or Spicy Sriracha Mayo.",
    price: 485.00,
    category: "chicken",
    imageUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80",
    signature: true
  },

  // === DRINKS & COFFEE ===
  {
    id: "drink-vanilla-cold-brew-12oz",
    name: "Vanilla Cold Brew (12oz)",
    description: "Premium Arabica bean cold brew with sweet vanilla syrup, 12oz size.",
    price: 85.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-vanilla-cold-brew-16oz",
    name: "Vanilla Cold Brew (16oz)",
    description: "Premium Arabica bean cold brew with sweet vanilla syrup, 16oz size.",
    price: 95.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "drink-coffee-latte-12oz",
    name: "Iced Coffee Latte (12oz)",
    description: "Premium Arabica espresso with chilled milk over ice, 12oz size.",
    price: 109.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-coffee-latte-16oz",
    name: "Iced Coffee Latte (16oz)",
    description: "Premium Arabica espresso with chilled milk over ice, 16oz size.",
    price: 119.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-spanish-latte-12oz",
    name: "Iced Spanish Latte (12oz)",
    description: "Sweetened Spanish style espresso latte with a velvety finish over ice, 12oz size.",
    price: 115.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-spanish-latte-16oz",
    name: "Iced Spanish Latte (16oz)",
    description: "Sweetened Spanish style espresso latte with a velvety finish over ice, 16oz size.",
    price: 125.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-caramel-macchiato-12oz",
    name: "Iced Caramel Macchiato (12oz)",
    description: "Espresso combined with vanilla-flavored syrup, milk, and caramel drizzle over ice, 12oz size.",
    price: 125.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
    signature: true
  },
  {
    id: "drink-caramel-macchiato-16oz",
    name: "Iced Caramel Macchiato (16oz)",
    description: "Espresso combined with vanilla-flavored syrup, milk, and caramel drizzle over ice, 16oz size.",
    price: 135.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-iced-mocha-12oz",
    name: "Iced Mocha (12oz)",
    description: "Espresso with rich chocolate sauce and milk over ice, 12oz size.",
    price: 145.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-iced-mocha-16oz",
    name: "Iced Mocha (16oz)",
    description: "Espresso with rich chocolate sauce and milk over ice, 16oz size.",
    price: 155.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-vanilla-frappe-12oz",
    name: "Vanilla Frappe (12oz)",
    description: "Blended vanilla frappe with whipped cream, 12oz size.",
    price: 125.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-vanilla-frappe-16oz",
    name: "Vanilla Frappe (16oz)",
    description: "Blended vanilla frappe with whipped cream, 16oz size.",
    price: 135.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-caramel-frappe-12oz",
    name: "Caramel Frappe (12oz)",
    description: "Blended caramel frappe with whipped cream, 12oz size.",
    price: 160.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-caramel-frappe-16oz",
    name: "Caramel Frappe (16oz)",
    description: "Blended caramel frappe with whipped cream, 16oz size.",
    price: 170.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "drink-chocolate-frappe-12oz",
    name: "Chocolate Frappe (12oz)",
    description: "Rich blended chocolate frappe with whipped cream, 12oz size.",
    price: 165.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-chocolate-frappe-16oz",
    name: "Chocolate Frappe (16oz)",
    description: "Rich blended chocolate frappe with whipped cream, 16oz size.",
    price: 175.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-mocha-frappe-12oz",
    name: "Mocha Frappe (12oz)",
    description: "Blended coffee-chocolate frappe with whipped cream, 12oz size.",
    price: 175.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-mocha-frappe-16oz",
    name: "Mocha Frappe (16oz)",
    description: "Blended coffee-chocolate frappe with whipped cream, 16oz size.",
    price: 185.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-mango-shake-16oz",
    name: "Mango Shake (16oz)",
    description: "Creamy blended fresh mango shake, 16oz size.",
    price: 105.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80",
    bestSeller: true
  },
  {
    id: "drink-strawberry-shake-16oz",
    name: "Strawberry Shake (16oz)",
    description: "Creamy blended sweet strawberry shake, 16oz size.",
    price: 105.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-coke",
    name: "Coke",
    description: "Chilled refreshing Coca-Cola can.",
    price: 35.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-sprite",
    name: "Sprite",
    description: "Chilled refreshing Sprite lemon-lime soda can.",
    price: 35.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1625772291427-39f21d374e85?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-lemon-iced-tea",
    name: "Lemon Iced Tea",
    description: "Chilled sweet lemon iced tea.",
    price: 35.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80"
  },
  {
    id: "drink-mineral-water",
    name: "Mineral Water",
    description: "Refreshing bottled mineral water.",
    price: 25.00,
    category: "drinks",
    imageUrl: "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=600&auto=format&fit=crop&q=80"
  }
];

const INITIAL_FEEDBACK: Feedback[] = [
  {
    id: "f-1",
    customerName: "Angelo Dimaculangan",
    rating: 5,
    comment: "The Smokehouse BBQ is absolute heaven. Thick bacon, crisp onion strings, and perfectly grilled beef. Highly recommended!",
    createdAt: "2026-05-18T10:30:00Z"
  },
  {
    id: "f-2",
    customerName: "Sofia Gonzales",
    rating: 5,
    comment: "Vinyard Classic has been my go-to since 2020! The secret house sauce is to die for, and the hand-cut potato wedges are perfect.",
    createdAt: "2026-05-19T14:45:00Z"
  },
  {
    id: "f-3",
    customerName: "Juan Dela Cruz",
    rating: 5,
    comment: "The best customer service. Quick delivery and incredibly delicious food. Love the reward points program!",
    createdAt: "2026-05-20T11:15:00Z"
  }
];

function readDB(): DBStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const bytes = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(bytes);
    }
  } catch (err) {
    console.error("Failed to read database file, resetting to empty store", err);
  }

  // Decoupled defaults
  const store: DBStore = {
    users: [
      {
        id: "admin-1",
        name: "Marc Vineyard",
        email: "admin@vinyard.com",
        role: "admin",
        loyaltyPoints: 1000,
        isOnline: false
      },
      {
        id: "customer-1",
        name: "Angelo Dimaculangan",
        email: "customer@vinyard.com",
        role: "customer",
        loyaltyPoints: 350,
        isOnline: false,
        address: "Catmonan St., Poblacion , Hinunangan, Southern Leyte, Philippines",
        lat: 10.3971559,
        lng: 125.1983495
      }
    ],
    orders: [
      {
        id: "VY-9042",
        userId: "customer-1",
        customerName: "Angelo Dimaculangan",
        items: [
          { menuItemId: "burger-classic", name: "Vinyard Classic Burger", price: 175.00, qty: 1, customizations: { pattyDone: "Medium" } },
          { menuItemId: "sides-cheese-fries-sharing", name: "Cheese Fries (Sharing)", price: 185.00, qty: 1, customizations: {} }
        ],
        subtotal: 360.00,
        deliveryFee: 45.00,
        total: 405.00,
        status: "preparing",
        createdAt: "2026-05-21T06:30:00Z",
        estimatedMinutes: 20,
        paymentMethod: "delivery",
        address: "Catmonan St., Poblacion, Hinunangan, Philippines",
        lat: 10.3971559,
        lng: 125.1983495
      }
    ],
    feedbacks: INITIAL_FEEDBACK
  };
  writeDB(store);
  return store;
}

function writeDB(store: DBStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to database file", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Database
  await initDB();

  // API Route list
  app.get("/api/menu", (req, res) => {
    res.json(INITIAL_MENU);
  });

  // Authentication & Management
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, role, isGoogleAuth } = req.body;
    if (!name || !email) {
       res.status(400).json({ error: "Missing required fields" });
       return;
    }

    const cleanEmail = email.toLowerCase().trim();
    
    try {
      // Check duplication
      const [existing] = await getPool().query<any[]>("SELECT * FROM users WHERE email = ?", [cleanEmail]);
      
      if (existing.length > 0) {
        const user = existing[0];
        // Simulate OAuth link if Google Login request on existing account
        if (isGoogleAuth) {
          await getPool().query("UPDATE users SET isOnline = ? WHERE id = ?", [true, user.id]);
          user.isOnline = true;
          res.json({ user });
          return;
        }
        res.status(400).json({ error: "Email address already registered." });
        return;
      }

      const newUser: User = {
        id: "u-" + Math.random().toString(36).substr(2, 9),
        name,
        email: cleanEmail,
        role: role === "admin" ? "admin" : "customer",
        loyaltyPoints: 100, // Welcome reward bonus points!
        isOnline: true,
        address: "Catmonan St., Poblacion , Hinunangan, Philippines",
        lat: 10.3971559,
        lng: 125.1983495
      };

      await getPool().query(
        "INSERT INTO users (id, name, email, role, loyaltyPoints, isOnline, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newUser.id, newUser.name, newUser.email, newUser.role, newUser.loyaltyPoints, newUser.isOnline, newUser.address, newUser.lat, newUser.lng]
      );

      res.json({ user: newUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error during registration" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, isGoogleAuth } = req.body;
    if (!email) {
       res.status(400).json({ error: "Username or email is required" });
       return;
    }

    const cleanEmail = email.toLowerCase().trim();
    
    try {
      const [users] = await getPool().query<any[]>("SELECT * FROM users WHERE email = ?", [cleanEmail]);
      let user = users.length > 0 ? users[0] : null;

      if (!user) {
        if (isGoogleAuth) {
          // Auto register on google auth
          const name = email.split("@")[0];
          const newUser: User = {
            id: "u-" + Math.random().toString(36).substr(2, 9),
            name: name.charAt(0).toUpperCase() + name.slice(1),
            email: cleanEmail,
            role: "customer",
            loyaltyPoints: 100,
            isOnline: true,
            address: "Catmonan St., Poblacion , Hinunangan, Philippines",
            lat: 10.3971559,
            lng: 125.1983495
          };
          
          await getPool().query(
            "INSERT INTO users (id, name, email, role, loyaltyPoints, isOnline, address, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [newUser.id, newUser.name, newUser.email, newUser.role, newUser.loyaltyPoints, newUser.isOnline, newUser.address, newUser.lat, newUser.lng]
          );
          
          res.json({ user: newUser });
          return;
        }
        res.status(400).json({ error: "Invalid credentials." });
        return;
      }

      await getPool().query("UPDATE users SET isOnline = ? WHERE id = ?", [true, user.id]);
      user.isOnline = true;
      res.json({ user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error during login" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    const { userId } = req.body;
    if (userId) {
      try {
        await getPool().query("UPDATE users SET isOnline = ? WHERE id = ?", [false, userId]);
      } catch (err) {
        console.error(err);
      }
    }
    res.json({ success: true });
  });

  app.post("/api/auth/profile/update", async (req, res) => {
    const { userId, name, address, lat, lng } = req.body;
    if (!userId) {
       res.status(400).json({ error: "Unauthorized" });
       return;
    }

    try {
      const [users] = await getPool().query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
      const user = users.length > 0 ? users[0] : null;
      
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (name) { updates.push("name = ?"); values.push(name); user.name = name; }
      if (address) { updates.push("address = ?"); values.push(address); user.address = address; }
      if (lat !== undefined) { updates.push("lat = ?"); values.push(lat); user.lat = lat; }
      if (lng !== undefined) { updates.push("lng = ?"); values.push(lng); user.lng = lng; }

      if (updates.length > 0) {
        values.push(userId);
        await getPool().query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);
      }

      res.json({ success: true, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error during profile update" });
    }
  });

  // Fetch accounts list (for Admin)
  app.get("/api/users", async (req, res) => {
    try {
      const [users] = await getPool().query("SELECT * FROM users");
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching users" });
    }
  });

  // Track coordinates and online users
  app.get("/api/users/online", async (req, res) => {
    try {
      const [users] = await getPool().query("SELECT * FROM users WHERE isOnline = TRUE");
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching online users" });
    }
  });

  // Orders Handling
  
  app.get("/api/admin/analytics", async (req, res) => {
    try {
      // 1. Total Revenue Today
      const [revData] = await getPool().query(`
        SELECT SUM(total) as revenue 
        FROM orders 
        WHERE status = 'complete' 
        AND DATE(createdAt) = CURDATE()
      `) as any[];
      const totalRevenueToday = revData[0]?.revenue || 0;

      // 2. Popular items (GROUP BY menuItemId)
      const [itemsData] = await getPool().query(`
        SELECT name, SUM(qty) as totalSold
        FROM order_items
        GROUP BY menuItemId
        ORDER BY totalSold DESC
        LIMIT 5
      `) as any[];

      // 3. Active Delivery Queues
      const [activeData] = await getPool().query(`
        SELECT COUNT(*) as activeCount
        FROM orders
        WHERE status NOT IN ('complete', 'cancelled')
      `) as any[];
      const activeDeliveryQueues = activeData[0]?.activeCount || 0;

      res.json({
        totalRevenueToday,
        popularItems: itemsData,
        activeDeliveryQueues
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching analytics" });
    }
  });

  app.get("/api/orders", async (req, res) => {
    const userId = req.query.userId as string;
    try {
      let query = "SELECT * FROM orders";
      let params: any[] = [];
      if (userId) {
        query += " WHERE userId = ?";
        params = [userId];
      }
      query += " ORDER BY createdAt DESC";
      
      const [orders] = await getPool().query<any[]>(query, params);
      
      // Fetch items and history for each order
      for (const order of orders) {
        const [items] = await getPool().query("SELECT * FROM order_items WHERE orderId = ?", [order.id]);
        const [history] = await getPool().query("SELECT * FROM status_history WHERE orderId = ? ORDER BY timestamp ASC", [order.id]);
        order.items = items;
        order.statusHistory = history;
      }
      
      res.json(orders);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching orders" });
    }
  });

  app.post("/api/orders/create", async (req, res) => {
    const { userId, items, subtotal, deliveryFee, distance, total, paymentMethod, address, lat, lng, redeemPoints, deliveryInstructions } = req.body;
    if (!userId || !items || items.length === 0) {
       res.status(400).json({ error: "Invalid order parameters" });
       return;
    }

    try {
      const [users] = await getPool().query<any[]>("SELECT * FROM users WHERE id = ?", [userId]);
      const user = users.length > 0 ? users[0] : null;
      if (!user) {
         res.status(404).json({ error: "User account not found" });
         return;
      }

      // Process Loyalty points spent
      let newLoyaltyPoints = user.loyaltyPoints;
      if (redeemPoints && redeemPoints > 0) {
        newLoyaltyPoints = Math.max(0, newLoyaltyPoints - redeemPoints);
      }

      // Earn point calculations (1 point for every ₱10 spent)
      const earned = Math.floor(total / 10);
      newLoyaltyPoints += earned;

      await getPool().query("UPDATE users SET loyaltyPoints = ? WHERE id = ?", [newLoyaltyPoints, userId]);
      user.loyaltyPoints = newLoyaltyPoints;

      const orderId = "VY-" + Math.floor(10000 + Math.random() * 90000);
      
      // Estimate Time to finish (e.g. baseline 15 mins + 3 mins per item)
      const count = items.reduce((acc: number, item: OrderItem) => acc + item.qty, 0);
      const estimatedMinutes = typeof req.body.estimatedMinutes === "number" ? req.body.estimatedMinutes : 15 + count * 2;

      const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' '); // MySQL format
      const newOrder: Order = {
        id: orderId,
        userId,
        customerName: user.name,
        items,
        subtotal,
        deliveryFee: deliveryFee !== undefined ? deliveryFee : 0,
        distance: distance !== undefined ? distance : 0,
        total,
        status: "received",
        createdAt: new Date().toISOString(),
        estimatedMinutes,
        paymentMethod: ["counter", "gcash", "card"].includes(paymentMethod) ? paymentMethod : "delivery",
        address: address || user.address || "Catmonan St., Poblacion , Hinunangan, Philippines",
        lat: lat !== undefined ? lat : user.lat || 10.3971559,
        lng: lng !== undefined ? lng : user.lng || 125.1983495,
        deliveryInstructions: deliveryInstructions || undefined,
        statusHistory: [
          { status: "received", timestamp: new Date().toISOString() }
        ]
      };

      // Insert Order
      await getPool().query(
        `INSERT INTO orders (id, userId, customerName, subtotal, deliveryFee, distance, total, status, createdAt, estimatedMinutes, paymentMethod, address, lat, lng, deliveryInstructions) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, userId, user.name, subtotal, deliveryFee, distance, total, "received", nowIso, estimatedMinutes, newOrder.paymentMethod, newOrder.address, newOrder.lat, newOrder.lng, deliveryInstructions]
      );

      // Insert Items
      for (const item of items) {
        await getPool().query(
          "INSERT INTO order_items (orderId, menuItemId, name, price, qty, customizations) VALUES (?, ?, ?, ?, ?, ?)",
          [orderId, item.menuItemId, item.name, item.price, item.qty, JSON.stringify(item.customizations)]
        );
      }

      // Insert History
      await getPool().query(
        "INSERT INTO status_history (orderId, status, timestamp) VALUES (?, ?, ?)",
        [orderId, "received", nowIso]
      );

      res.json({ success: true, order: newOrder, user });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error during order creation" });
    }
  });

  app.post("/api/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
       res.status(400).json({ error: "Missing status parameter" });
       return;
    }

    try {
      const [orders] = await getPool().query<any[]>("SELECT * FROM orders WHERE id = ?", [id]);
      const order = orders.length > 0 ? orders[0] : null;
      if (!order) {
         res.status(404).json({ error: "Order not found" });
         return;
      }

      const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

      await getPool().query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
      await getPool().query("INSERT INTO status_history (orderId, status, timestamp) VALUES (?, ?, ?)", [id, status, nowIso]);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error updating status" });
    }
  });

  app.post("/api/orders/:id/rate", async (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!rating) {
       res.status(400).json({ error: "Rating is required" });
       return;
    }

    try {
      const [orders] = await getPool().query<any[]>("SELECT * FROM orders WHERE id = ?", [id]);
      const order = orders.length > 0 ? orders[0] : null;
      if (!order) {
         res.status(404).json({ error: "Order not found" });
         return;
      }

      const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const feedbackId = "f-" + Math.random().toString(36).substr(2, 9);

      await getPool().query("UPDATE orders SET rating = ?, feedback = ? WHERE id = ?", [rating, comment || "", id]);
      await getPool().query(
        "INSERT INTO feedbacks (id, customerName, rating, comment, createdAt) VALUES (?, ?, ?, ?, ?)",
        [feedbackId, order.customerName, rating, comment || "Delicious!", nowIso]
      );

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error during rating" });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    try {
      const [feedbacks] = await getPool().query("SELECT * FROM feedbacks ORDER BY createdAt DESC");
      res.json(feedbacks);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Server error fetching feedback" });
    }
  });

  // Serve Vite in development, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Vinyard Burger Bar DB initialized. Running on Server http://0.0.0.0:${PORT}`);
  });
}

startServer();
