const pool = require("../config/db");

function formatAuditDetails(details) {
  if (details === null || details === undefined) {
    return null;
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch (error) {
    return String(details);
  }
}

async function logAuditAction({ userId = null, action, details = null }) {
  if (!action) {
    return;
  }

  await pool.query(
    "INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)",
    [userId, action, formatAuditDetails(details)]
  );
}

module.exports = { logAuditAction };
