const multer = require("multer");
//const path = require('path');

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // ensure this folder exists
  },
  filename: (req, file, cb) => {
    // e.g. avatar-1625231234123.png
    const timestamp = Date.now();
    const ext = file.originalname.split(".").pop();
    cb(null, `avatar-${req.userId || "anon"}-${timestamp}.${ext}`);
  },
});
const upload = multer({ storage }); // 3

module.exports = upload;
