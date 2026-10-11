const pool = require("../config/db");
const { logAuditAction } = require("../utils/auditLogger");

async function getCategories(req, res) {
  const [categories] = await pool.query(
    "SELECT * FROM product_categories WHERE status = 'active' ORDER BY name"
  );

  res.json({ categories });
}

async function createCategory(req, res) {
  const { name, description } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Category name is required." });
  }

  const [result] = await pool.query(
    "INSERT INTO product_categories (name, description) VALUES (?, ?)",
    [name, description || null]
  );

  await logAuditAction({
    userId: req.user.id,
    action: "category_created",
    details: { id: result.insertId, name, description: description || null }
  });

  res.status(201).json({ message: "Category created.", id: result.insertId });
}

async function updateCategory(req, res) {
  const { name, description, status } = req.body;

  if (!name) {
    return res.status(400).json({ message: "Category name is required." });
  }

  await pool.query(
    "UPDATE product_categories SET name = ?, description = ?, status = ? WHERE id = ?",
    [name, description || null, status || "active", req.params.id]
  );

  await logAuditAction({
    userId: req.user.id,
    action: "category_updated",
    details: { id: req.params.id, name, description: description || null, status: status || "active" }
  });

  res.json({ message: "Category updated." });
}

module.exports = { getCategories, createCategory, updateCategory };
