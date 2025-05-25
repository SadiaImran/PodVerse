const express = require("express");
const router = express.Router();
const {
  getAllDefaultVoices,
  createDefaultVoice,
  updateDefaultVoice,
  deleteDefaultVoice,
} = require("../controllers/defaultVoicesController");

router.get("/", getAllDefaultVoices);
router.post("/", createDefaultVoice);
router.put("/:id", updateDefaultVoice);
router.delete("/:id", deleteDefaultVoice);

module.exports = router;
