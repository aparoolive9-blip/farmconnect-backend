const express = require("express");
const {
  getMyFavorites,
  getFavoriteStatus,
  toggleFavorite,
  removeFavorite
} = require("../controllers/favoriteController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", authMiddleware, roleMiddleware("buyer"), asyncHandler(getMyFavorites));
router.get("/my-favorites", authMiddleware, roleMiddleware("buyer"), asyncHandler(getMyFavorites));
router.get("/:productId", authMiddleware, roleMiddleware("buyer"), asyncHandler(getFavoriteStatus));
router.post("/", authMiddleware, roleMiddleware("buyer"), asyncHandler(toggleFavorite));
router.post("/:productId", authMiddleware, roleMiddleware("buyer"), asyncHandler(toggleFavorite));
router.delete("/:productId", authMiddleware, roleMiddleware("buyer"), asyncHandler(removeFavorite));

module.exports = router;
