const pool = require("../config/db");
const { logAuditAction } = require("../utils/auditLogger");

const allowedStatuses = ["open", "answered", "closed"];

async function createInquiry(req, res) {
  const { product_id, message } = req.body;

  if (!product_id || !message) {
    return res.status(400).json({ message: "Product and message are required." });
  }

  const [products] = await pool.query("SELECT farmer_id FROM products WHERE id = ?", [product_id]);
  const product = products[0];

  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  if (product.farmer_id === req.user.id) {
    return res.status(400).json({ message: "Farmers cannot inquire about their own products." });
  }

  const [result] = await pool.query(
    "INSERT INTO inquiries (buyer_id, farmer_id, product_id, message) VALUES (?, ?, ?, ?)",
    [req.user.id, product.farmer_id, product_id, message]
  );

  await logAuditAction({
    userId: req.user.id,
    action: "inquiry_created",
    details: { id: result.insertId, product_id, farmer_id: product.farmer_id }
  });

  res.status(201).json({ message: "Inquiry sent.", id: result.insertId });
}

async function getMyInquiries(req, res) {
  const [inquiries] = await pool.query(
    `SELECT i.*, p.product_name, u.full_name AS farmer_name
     FROM inquiries i
     JOIN products p ON i.product_id = p.id
     JOIN users u ON i.farmer_id = u.id
     WHERE i.buyer_id = ?
     ORDER BY i.created_at DESC`,
    [req.user.id]
  );

  res.json({ inquiries });
}

async function getFarmerInquiries(req, res) {
  const [inquiries] = await pool.query(
    `SELECT i.*, p.product_name, u.full_name AS buyer_name, u.phone AS buyer_phone
     FROM inquiries i
     JOIN products p ON i.product_id = p.id
     JOIN users u ON i.buyer_id = u.id
     WHERE i.farmer_id = ?
     ORDER BY i.created_at DESC`,
    [req.user.id]
  );

  res.json({ inquiries });
}

async function updateInquiryStatus(req, res) {
  const { status } = req.body;

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid inquiry status." });
  }

  const [inquiries] = await pool.query("SELECT * FROM inquiries WHERE id = ?", [req.params.id]);
  const inquiry = inquiries[0];

  if (!inquiry) {
    return res.status(404).json({ message: "Inquiry not found." });
  }

  if (req.user.role !== "admin" && inquiry.farmer_id !== req.user.id) {
    return res.status(403).json({ message: "You can only update inquiries for your own products." });
  }

  await pool.query("UPDATE inquiries SET status = ? WHERE id = ?", [status, req.params.id]);

  await logAuditAction({
    userId: req.user.id,
    action: "inquiry_updated",
    details: { id: req.params.id, status, farmer_id: inquiry.farmer_id, buyer_id: inquiry.buyer_id }
  });

  res.json({ message: "Inquiry status updated." });
}

module.exports = { createInquiry, getMyInquiries, getFarmerInquiries, updateInquiryStatus };
