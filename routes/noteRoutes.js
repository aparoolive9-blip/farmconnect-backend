const express = require("express");
const {
  getMyNotes,
  createNote,
  updateNote,
  deleteNote
} = require("../controllers/noteController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/my-notes", authMiddleware, roleMiddleware("buyer"), asyncHandler(getMyNotes));
router.post("/", authMiddleware, roleMiddleware("buyer"), asyncHandler(createNote));
router.put("/:id", authMiddleware, roleMiddleware("buyer"), asyncHandler(updateNote));
router.delete("/:id", authMiddleware, roleMiddleware("buyer"), asyncHandler(deleteNote));

module.exports = router;
