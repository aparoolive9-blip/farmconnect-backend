const express = require("express");
const {
  getStats,
  getUsers,
  getProducts,
  getOrders,
  getAuditLogs,
  updateUserStatus
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.use(authMiddleware, roleMiddleware("admin"));
router.get("/stats", asyncHandler(getStats));
router.get("/users", asyncHandler(getUsers));
router.get("/products", asyncHandler(getProducts));
router.get("/orders", asyncHandler(getOrders));
router.get("/audit-logs", asyncHandler(getAuditLogs));
router.put("/users/:id/status", asyncHandler(updateUserStatus));

module.exports = router;
