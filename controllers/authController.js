const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { logAuditAction } = require("../utils/auditLogger");

function createToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, full_name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );
}

async function register(req, res) {
  const { full_name, email, phone, password, role } = req.body;
  const allowedRoles = ["farmer", "buyer"];

  if (!full_name || !email || !phone || !password || !role) {
    return res.status(400).json({ message: "Full name, email, phone, password, and role are required." });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Role must be farmer or buyer." });
  }

  const [existingUsers] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existingUsers.length > 0) {
    return res.status(409).json({ message: "A user with this email already exists." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (full_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
    [full_name, email, phone, hashedPassword, role]
  );

  await logAuditAction({
    userId: result.insertId,
    action: "user_registered",
    details: { full_name, email, role }
  });

  res.status(201).json({
    message: "Account created successfully.",
    user: { id: result.insertId, full_name, email, phone, role, status: "active" }
  });
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  const user = users[0];

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password." });
  }

  if (user.status !== "active") {
    return res.status(403).json({ message: "This account is not active." });
  }

  const token = createToken(user);
  delete user.password;

  res.json({ message: "Login successful.", token, user });
}

async function getMe(req, res) {
  const [users] = await pool.query(
    "SELECT id, full_name, email, phone, role, status, created_at, updated_at FROM users WHERE id = ?",
    [req.user.id]
  );

  if (!users[0]) {
    return res.status(404).json({ message: "User not found." });
  }

  res.json({ user: users[0] });
}

module.exports = { register, login, getMe };
