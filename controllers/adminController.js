const pool = require("../config/db");

async function getStats(req, res) {
  const [[userStats]] = await pool.query("SELECT COUNT(*) AS total_users FROM users");
  const [[productStats]] = await pool.query("SELECT COUNT(*) AS total_products FROM products");
  const [[orderStats]] = await pool.query("SELECT COUNT(*) AS total_orders FROM orders");
  const [[inquiryStats]] = await pool.query("SELECT COUNT(*) AS total_inquiries FROM inquiries");

  res.json({
    stats: {
      total_users: userStats.total_users,
      total_products: productStats.total_products,
      total_orders: orderStats.total_orders,
      total_inquiries: inquiryStats.total_inquiries
    }
  });
}

async function getUsers(req, res) {
  const [users] = await pool.query(
    "SELECT id, full_name, email, phone, role, status, created_at, updated_at FROM users ORDER BY created_at DESC"
  );

  res.json({ users });
}

async function getProducts(req, res) {
  const [products] = await pool.query(
    `SELECT p.*, c.name AS category_name, u.full_name AS farmer_name
     FROM products p
     JOIN users u ON p.farmer_id = u.id
     LEFT JOIN product_categories c ON p.category_id = c.id
     ORDER BY p.created_at DESC`
  );

  res.json({ products });
}

async function getOrders(req, res) {
  const [orders] = await pool.query(
    `SELECT o.*, p.product_name, buyer.full_name AS buyer_name, farmer.full_name AS farmer_name
     FROM orders o
     JOIN products p ON o.product_id = p.id
     JOIN users buyer ON o.buyer_id = buyer.id
     JOIN users farmer ON o.farmer_id = farmer.id
     ORDER BY o.created_at DESC`
  );

  res.json({ orders });
}

async function getAuditLogs(req, res) {
  const [logs] = await pool.query(
    `SELECT a.*, u.full_name AS user_name, u.email, u.role
     FROM audit_logs a
     LEFT JOIN users u ON a.user_id = u.id
     ORDER BY a.created_at DESC
     LIMIT 200`
  );

  res.json({ logs });
}

async function updateUserStatus(req, res) {
  const { status } = req.body;
  const allowedStatuses = ["active", "inactive"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Status must be active or inactive." });
  }

  await pool.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
  res.json({ message: "User status updated." });
}

module.exports = { getStats, getUsers, getProducts, getOrders, getAuditLogs, updateUserStatus };
