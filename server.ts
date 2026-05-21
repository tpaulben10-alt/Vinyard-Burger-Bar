import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { User, MenuItem, Order, Feedback, OrderItem } from "./src/types";

// Database storage setup
const DB_FILE = path.join(process.cwd(), "db.json");

interface DBStore {
  users: User[];
  orders: Order[];
  feedbacks: Feedback[];
}

const INITIAL_MENU: MenuItem[] = [
  {
    id: "vinyard-classic",
    name: "The Vinyard Classic",
    description: "Double beef patty, aged cheddar, butter lettuce, heirloom tomato, and our signature Vinyard sauce on a potato bun.",
    price: 14.50,
    category: "burgers",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC0O_m-FBiO5weZPAwzib9ekLQVPNj0zovabFu70uBmxIxAr0cmep4NUIygouLjOK-UeTXwMqglMWAni46FjsJTVDwPVkZEtK6I-fQA8POXAyBH8Hxjjx3JRqf-VP1KoOHCEVuIdUCT6fq8YaxsohEWQC6KUrL-qizokDA17YaS4EQYuvNlWwxMD7HGzSeOyK0J7ptoa-YADK2uEuFp69mD_qCmv61TavAJBqVXSMwMRGzMuz4sUTnElEzX19udF5YDQKGMyVkxSF8",
    signature: true
  },
  {
    id: "smokehouse-bbq",
    name: "Smokehouse BBQ",
    description: "Smoked bacon, crispy onion strings, sharp provolone, and hickory BBQ sauce. A local favorite since 2020.",
    price: 16.00,
    category: "burgers",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDix3J03byQ6JqTySDIhFwnbc7rgYPweYbckmcrvS7YGsBi6f-rxPvT8QLExpOTJ47CrVuCN5jfr5-zu-l8t_91zuT5n2Fwx50rKF-hTAszkyP5WROMF3XoJ0dVobbykGyIxTEjBPUjBz3dYjUS3oWkcb059CbTpxS-KO86oxwsl8dHlyWnaOVIC8o9MoMFhnoaeVG7rBRhuTb27PIRLOzPlUANMJqrgkzp2vOz49n4Vn3wf4nyIEXwaeYCSsDmZREqGRmYYQZ2ij4",
    signature: true
  },
  {
    id: "potato-wedges",
    name: "Hand-Cut Potato Wedges",
    description: "Twice-fried for ultimate crunch, tossed in sea salt and rosemary. Served with house garlic aioli.",
    price: 6.50,
    category: "sides",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYd3oATjvt4ezB1nh7tivxj1IaauAHCn_axy8Si8J_xBvgcDqWlf86vLk2H-9vx0vNxxGDQT3-ZCkJXc4JZqDNoroSy5lCeogEmVzYJcj5iwVWwpDphLvMyHCOMioGeMkY4o_783PjwXQm_ym19H74FAW7Dj1CJ6nmqrr0_FR0YqT2Y8XdU3SB3QxZW4xU2LM0BhjZI1NUcV3gVI42WerOHa4q_BdGiokgorNvtwLy22DvDJiC6fggcHIubYcGlji7ztfBo7cQRmU",
    bestSeller: true
  },
  {
    id: "classic-fries",
    name: "Classic Fries",
    description: "Thin, salted French fries in a simple paper wrap, seasoned with sea salt.",
    price: 4.50,
    category: "sides",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCwIncme2DszRpa6PY5Rc8ayv32QfCOSDWXB8T9rvFhlCwAAv3kxr6DljgvWE_ZwapPeWv8kGl_qzHZf5e1qQgIyWveGS1iHey1hPRSJceM7AOTf9-pDh59AXrSdvgAb-iM3QJlPFlmBuXUbwhiZcHYbjW-jlGWMxhmF6Iet_Sduyp1o_VMDzXNY3ObaUV7WTNN8oV8txug8J6aMOoD0Wi5YlT8OdqqZbfZHa3YTaOUoEOr3ifIApG-uMIR2Bl1VP4PravBSjL6nhg",
  },
  {
    id: "fried-ice-cream",
    name: "Fried Ice Cream",
    description: "Vanilla bean center with a crispy cinnamon-sugar coating. The legendary finale.",
    price: 8.00,
    category: "treats",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDiMaKDN398gIRMSJkuMhi7UgNVhByh9gy_VlX4abEZdcceIBra7jlx4mQqpGpkTHZMZcB3PxzBVfXXcbaFzPsMqehz1RkLTUMy63BqNJMr3GZic_uuBwSUgzOgvTLC2rcPxQI3KKOm9zM2MiOP_A-SHAkQZ7UBoF7WdYlRXzBieWilHA8HT8PiSMXjf_-hUPI9MKY40SFfQHPa7yaMtcUJH3GVzD3ZYTv5nGvwucCSN3sQIaAcPBSRAW1Q9qntwgZCU8GFwJVVVks",
  },
  {
    id: "craft-shakes",
    name: "Craft Shakes",
    description: "Real cream, spun fresh. Choose from Chocolate, Vanilla, or Strawberry.",
    price: 7.50,
    category: "treats",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCQNLa7gn0SEtBWY9bgvn9zz7zXq6L2pIJzaugVuAWWlcA-RLZj4CTOj98V1QVi9MLlKEVrGmw9YsA-ZkKQVY8r7m3YBt_FU_t3auwgo6rXmMbAjDVM1TCbIXpyHXHyCtmF3oX6hkRFrql1zXfL4INY7bcWMjXF31ziLdIJCeUqvr0mq17XSKPDgmHss9TLNUDrTi07qudAWNpIL1ZsAypMj3o4e2lVEIDCM1cKTcPLFPdyRZ-lqdve9NVynBMJfJ6aPBZ_0cfpIa4",
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
          { menuItemId: "vinyard-classic", name: "The Vinyard Classic", price: 14.50, qty: 1, customizations: { pattyDone: "Medium" } },
          { menuItemId: "potato-wedges", name: "Hand-Cut Potato Wedges", price: 6.50, qty: 1, customizations: {} }
        ],
        subtotal: 21.00,
        total: 21.00,
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

  // API Route list
  app.get("/api/menu", (req, res) => {
    res.json(INITIAL_MENU);
  });

  // Authentication & Management
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role, isGoogleAuth } = req.body;
    if (!name || !email) {
       res.status(400).json({ error: "Missing required fields" });
       return;
    }

    const store = readDB();
    const cleanEmail = email.toLowerCase().trim();
    
    // Check duplication
    const existing = store.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      // Simulate OAuth link if Google Login request on existing account
      if (isGoogleAuth) {
        existing.isOnline = true;
        writeDB(store);
         res.json({ user: existing });
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

    store.users.push(newUser);
    writeDB(store);

    res.json({ user: newUser });
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, isGoogleAuth } = req.body;
    if (!email) {
       res.status(400).json({ error: "Username or email is required" });
       return;
    }

    const store = readDB();
    const cleanEmail = email.toLowerCase().trim();
    let user = store.users.find(u => u.email.toLowerCase() === cleanEmail);

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
        store.users.push(newUser);
        writeDB(store);
         res.json({ user: newUser });
         return;
      }
       res.status(400).json({ error: "Invalid credentials." });
       return;
    }

    user.isOnline = true;
    writeDB(store);
    res.json({ user });
  });

  app.post("/api/auth/logout", (req, res) => {
    const { userId } = req.body;
    if (userId) {
      const store = readDB();
      const user = store.users.find(u => u.id === userId);
      if (user) {
        user.isOnline = false;
        writeDB(store);
      }
    }
    res.json({ success: true });
  });

  app.post("/api/auth/profile/update", (req, res) => {
    const { userId, name, address, lat, lng } = req.body;
    if (!userId) {
       res.status(400).json({ error: "Unauthorized" });
       return;
    }

    const store = readDB();
    const user = store.users.find(u => u.id === userId);
    if (!user) {
       res.status(404).json({ error: "User not found" });
       return;
    }

    if (name) user.name = name;
    if (address) user.address = address;
    if (lat !== undefined) user.lat = lat;
    if (lng !== undefined) user.lng = lng;

    writeDB(store);
    res.json({ success: true, user });
  });

  // Fetch accounts list (for Admin)
  app.get("/api/users", (req, res) => {
    const store = readDB();
    res.json(store.users);
  });

  // Track coordinates and online users
  app.get("/api/users/online", (req, res) => {
    const store = readDB();
    res.json(store.users.filter(u => u.isOnline));
  });

  // Orders Handling
  app.get("/api/orders", (req, res) => {
    const userId = req.query.userId as string;
    const store = readDB();
    if (userId) {
      res.json(store.orders.filter(o => o.userId === userId));
    } else {
      res.json(store.orders);
    }
  });

  app.post("/api/orders/create", (req, res) => {
    const { userId, items, subtotal, total, paymentMethod, address, lat, lng, redeemPoints } = req.body;
    if (!userId || !items || items.length === 0) {
       res.status(400).json({ error: "Invalid order parameters" });
       return;
    }

    const store = readDB();
    const user = store.users.find(u => u.id === userId);
    if (!user) {
       res.status(404).json({ error: "User account not found" });
       return;
    }

    // Process Loyalty points spent
    if (redeemPoints && redeemPoints > 0) {
      user.loyaltyPoints = Math.max(0, user.loyaltyPoints - redeemPoints);
    }

    // Earn point calculations (10 points per dollar spent)
    const earned = Math.floor(total * 10);
    user.loyaltyPoints += earned;

    const orderId = "VY-" + Math.floor(10000 + Math.random() * 90000);
    
    // Estimate Time to finish (e.g. baseline 15 mins + 3 mins per item)
    const count = items.reduce((acc: number, item: OrderItem) => acc + item.qty, 0);
    const estimatedMinutes = 15 + count * 2;

    const newOrder: Order = {
      id: orderId,
      userId,
      customerName: user.name,
      items,
      subtotal,
      total,
      status: "received",
      createdAt: new Date().toISOString(),
      estimatedMinutes,
      paymentMethod: paymentMethod === "counter" ? "counter" : "delivery",
      address: address || user.address || "Catmonan St., Poblacion , Hinunangan, Philippines",
      lat: lat !== undefined ? lat : user.lat || 10.3971559,
      lng: lng !== undefined ? lng : user.lng || 125.1983495
    };

    store.orders.unshift(newOrder);
    writeDB(store);

    res.json({ success: true, order: newOrder, user });
  });

  app.post("/api/orders/:id/status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
       res.status(400).json({ error: "Missing status parameter" });
       return;
    }

    const store = readDB();
    const order = store.orders.find(o => o.id === id);
    if (!order) {
       res.status(404).json({ error: "Order not found" });
       return;
    }

    order.status = status;
    writeDB(store);
    res.json({ success: true, order });
  });

  app.post("/api/orders/:id/rate", (req, res) => {
    const { id } = req.params;
    const { rating, comment } = req.body;
    if (!rating) {
       res.status(400).json({ error: "Rating is required" });
       return;
    }

    const store = readDB();
    const order = store.orders.find(o => o.id === id);
    if (!order) {
       res.status(404).json({ error: "Order not found" });
       return;
    }

    order.rating = rating;
    order.feedback = comment || "";

    const newFeedback: Feedback = {
      id: "f-" + Math.random().toString(36).substr(2, 9),
      customerName: order.customerName,
      rating,
      comment: comment || "Delicious!",
      createdAt: new Date().toISOString()
    };

    store.feedbacks.unshift(newFeedback);
    writeDB(store);
    res.json({ success: true, order, feedback: newFeedback });
  });

  app.get("/api/feedback", (req, res) => {
    const store = readDB();
    res.json(store.feedbacks);
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
