const pool = require("../config/db");
const { logAuditAction } = require("../utils/auditLogger");

function buildProductFilters(query) {
  const filters = ["p.availability_status = 'available'"];
  const values = [];

  if (query.name) {
    filters.push("p.product_name LIKE ?");
    values.push(`%${query.name}%`);
  }

  if (query.category_id) {
    filters.push("p.category_id = ?");
    values.push(query.category_id);
  }

  if (query.district) {
    filters.push("p.district LIKE ?");
    values.push(`%${query.district}%`);
  }

  if (query.min_price) {
    filters.push("p.price_per_unit >= ?");
    values.push(query.min_price);
  }

  if (query.max_price) {
    filters.push("p.price_per_unit <= ?");
    values.push(query.max_price);
  }

  if (query.min_quantity) {
    filters.push("p.quantity >= ?");
    values.push(query.min_quantity);
  }

  return { whereClause: filters.length ? `WHERE ${filters.join(" AND ")}` : "", values };
}

const productSelect = `
  SELECT p.*, c.name AS category_name, u.full_name AS farmer_name, u.phone AS farmer_phone
  FROM products p
  JOIN users u ON p.farmer_id = u.id
  LEFT JOIN product_categories c ON p.category_id = c.id
`;

async function getProducts(req, res) {
  const { whereClause, values } = buildProductFilters(req.query);
  const [products] = await pool.query(`${productSelect} ${whereClause} ORDER BY p.created_at DESC`, values);

  res.json({ products });
}

async function getProductById(req, res) {
  const [products] = await pool.query(`${productSelect} WHERE p.id = ?`, [req.params.id]);

  if (!products[0]) {
    return res.status(404).json({ message: "Product not found." });
  }

  res.json({ product: products[0] });
}

async function getMyProducts(req, res) {
  const [products] = await pool.query(
    `${productSelect} WHERE p.farmer_id = ? ORDER BY p.created_at DESC`,
    [req.user.id]
  );

  res.json({ products });
}

async function createProduct(req, res) {
  const {
    category_id,
    product_name,
    description,
    quantity,
    unit,
    price_per_unit,
    district,
    location_details,
    harvest_date
  } = req.body;

  if (!category_id || !product_name || !quantity || !unit || !price_per_unit || !district) {
    return res.status(400).json({ message: "Category, product name, quantity, unit, price, and district are required." });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : null;
  const [result] = await pool.query(
    `INSERT INTO products
      (farmer_id, category_id, product_name, description, quantity, unit, price_per_unit, district, location_details, image, harvest_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      category_id,
      product_name,
      description || null,
      quantity,
      unit,
      price_per_unit,
      district,
      location_details || null,
      image,
      harvest_date || null
    ]
  );

  await logAuditAction({
    userId: req.user.id,
    action: "product_created",
    details: { id: result.insertId, product_name, category_id }
  });

  res.status(201).json({ message: "Product listing created.", id: result.insertId });
}

async function updateProduct(req, res) {
  const [products] = await pool.query("SELECT * FROM products WHERE id = ?", [req.params.id]);
  const product = products[0];

  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  if (product.farmer_id !== req.user.id) {
    return res.status(403).json({ message: "You can only edit your own product listings." });
  }

  const image = req.file ? `/uploads/${req.file.filename}` : product.image;
  const nextProduct = { ...product, ...req.body, image };

  await pool.query(
    `UPDATE products SET
      category_id = ?,
      product_name = ?,
      description = ?,
      quantity = ?,
      unit = ?,
      price_per_unit = ?,
      district = ?,
      location_details = ?,
      image = ?,
      harvest_date = ?,
      availability_status = ?
     WHERE id = ?`,
    [
      nextProduct.category_id,
      nextProduct.product_name,
      nextProduct.description,
      nextProduct.quantity,
      nextProduct.unit,
      nextProduct.price_per_unit,
      nextProduct.district,
      nextProduct.location_details,
      nextProduct.image,
      nextProduct.harvest_date,
      nextProduct.availability_status,
      req.params.id
    ]
  );

  await logAuditAction({
    userId: req.user.id,
    action: "product_updated",
    details: { id: req.params.id, product_name: nextProduct.product_name }
  });

  res.json({ message: "Product listing updated." });
}

async function deleteProduct(req, res) {
  const [products] = await pool.query("SELECT farmer_id FROM products WHERE id = ?", [req.params.id]);
  const product = products[0];

  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  if (req.user.role !== "admin" && product.farmer_id !== req.user.id) {
    return res.status(403).json({ message: "You can only delete your own product listings." });
  }

  // Soft delete keeps history for orders and inquiries while removing the listing from search results.
  await pool.query("UPDATE products SET availability_status = 'inactive' WHERE id = ?", [req.params.id]);

  await logAuditAction({
    userId: req.user.id,
    action: "product_removed",
    details: { id: req.params.id }
  });

  res.json({ message: "Product listing removed." });
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts
};
