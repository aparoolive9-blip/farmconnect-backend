const pool = require("../config/db");
const { logAuditAction } = require("../utils/auditLogger");

async function getMyFavorites(req, res) {
  const [favorites] = await pool.query(
    `SELECT f.id, f.product_id, p.product_name, p.description, p.quantity, p.unit,
            p.price_per_unit, p.district, p.location_details, p.image,
            p.availability_status, u.full_name AS farmer_name
     FROM favorites f
     JOIN products p ON f.product_id = p.id
     JOIN users u ON p.farmer_id = u.id
     WHERE f.buyer_id = ?
     ORDER BY f.created_at DESC`,
    [req.user.id]
  );

  res.json({ favorites });
}

async function getFavoriteStatus(req, res) {
  const productId = Number(req.params.productId || req.body?.product_id);

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required." });
  }

  const [favorites] = await pool.query(
    "SELECT id FROM favorites WHERE buyer_id = ? AND product_id = ?",
    [req.user.id, productId]
  );

  res.json({ isFavorite: favorites.length > 0 });
}

async function toggleFavorite(req, res) {
  const productId = Number(req.params.productId ?? req.body?.product_id);

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required." });
  }

  const [products] = await pool.query("SELECT id FROM products WHERE id = ?", [productId]);
  if (!products[0]) {
    return res.status(404).json({ message: "Product not found." });
  }

  const [existing] = await pool.query(
    "SELECT id FROM favorites WHERE buyer_id = ? AND product_id = ?",
    [req.user.id, productId]
  );

  if (existing[0]) {
    await pool.query(
      "DELETE FROM favorites WHERE buyer_id = ? AND product_id = ?",
      [req.user.id, productId]
    );

    await logAuditAction({
      userId: req.user.id,
      action: "favorite_removed",
      details: { product_id: productId }
    });

    return res.json({ message: "Favorite removed.", isFavorite: false });
  }

  await pool.query(
    "INSERT INTO favorites (buyer_id, product_id) VALUES (?, ?)",
    [req.user.id, productId]
  );

  await logAuditAction({
    userId: req.user.id,
    action: "favorite_saved",
    details: { product_id: productId }
  });

  res.status(201).json({ message: "Favorite saved.", isFavorite: true });
}

async function removeFavorite(req, res) {
  const productId = Number(req.params.productId || req.body?.product_id);

  if (!productId) {
    return res.status(400).json({ message: "Product ID is required." });
  }

  const [result] = await pool.query(
    "DELETE FROM favorites WHERE buyer_id = ? AND product_id = ?",
    [req.user.id, productId]
  );

  if (result.affectedRows === 0) {
    return res.status(404).json({ message: "Favorite not found." });
  }

  await logAuditAction({
    userId: req.user.id,
    action: "favorite_removed",
    details: { product_id: productId }
  });

  res.json({ message: "Favorite removed.", isFavorite: false });
}

module.exports = { getMyFavorites, getFavoriteStatus, toggleFavorite, removeFavorite };
