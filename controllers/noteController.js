const pool = require("../config/db");
const { logAuditAction } = require("../utils/auditLogger");

async function getMyNotes(req, res) {
  const [notes] = await pool.query(
    `SELECT n.*, p.product_name, u.full_name AS farmer_name
     FROM product_notes n
     JOIN products p ON n.product_id = p.id
     JOIN users u ON p.farmer_id = u.id
     WHERE n.buyer_id = ?
     ORDER BY n.updated_at DESC`,
    [req.user.id]
  );

  res.json({ notes });
}

async function createNote(req, res) {
  const { product_id, note_text } = req.body;

  if (!product_id) {
    return res.status(400).json({ message: "Product is required." });
  }

  if (!note_text || !note_text.trim()) {
    return res.status(400).json({ message: "A note is required." });
  }

  const [products] = await pool.query("SELECT id FROM products WHERE id = ?", [product_id]);
  if (!products[0]) {
    return res.status(404).json({ message: "Product not found." });
  }

  const trimmedNote = note_text.trim();
  try {
    const [result] = await pool.query(
      "INSERT INTO product_notes (buyer_id, product_id, note_text) VALUES (?, ?, ?)",
      [req.user.id, product_id, trimmedNote]
    );

    await logAuditAction({
      userId: req.user.id,
      action: "note_created",
      details: { product_id, note_id: result.insertId }
    });

    const [notes] = await pool.query(
    `SELECT n.*, p.product_name, u.full_name AS farmer_name
     FROM product_notes n
     JOIN products p ON n.product_id = p.id
     JOIN users u ON p.farmer_id = u.id
     WHERE n.id = ?`,
    [result.insertId]
  );

    res.status(201).json({ message: "Note saved.", note: notes[0] });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "You already saved a note for this product." });
    }

    throw error;
  }
}

async function updateNote(req, res) {
  const { note_text } = req.body;

  if (!note_text || !note_text.trim()) {
    return res.status(400).json({ message: "A note is required." });
  }

  const [notes] = await pool.query("SELECT * FROM product_notes WHERE id = ?", [req.params.id]);
  const note = notes[0];

  if (!note) {
    return res.status(404).json({ message: "Note not found." });
  }

  if (note.buyer_id !== req.user.id) {
    return res.status(403).json({ message: "You can only edit your own notes." });
  }

  await pool.query("UPDATE product_notes SET note_text = ? WHERE id = ?", [note_text.trim(), req.params.id]);

  await logAuditAction({
    userId: req.user.id,
    action: "note_updated",
    details: { note_id: req.params.id, product_id: note.product_id }
  });

  res.json({ message: "Note updated." });
}

async function deleteNote(req, res) {
  const [notes] = await pool.query("SELECT buyer_id FROM product_notes WHERE id = ?", [req.params.id]);
  const note = notes[0];

  if (!note) {
    return res.status(404).json({ message: "Note not found." });
  }

  if (note.buyer_id !== req.user.id) {
    return res.status(403).json({ message: "You can only delete your own notes." });
  }

  await pool.query("DELETE FROM product_notes WHERE id = ?", [req.params.id]);

  await logAuditAction({
    userId: req.user.id,
    action: "note_deleted",
    details: { note_id: req.params.id }
  });

  res.json({ message: "Note removed." });
}

module.exports = { getMyNotes, createNote, updateNote, deleteNote };
