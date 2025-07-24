// middleware/postsUploadMulterConfig.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// make sure folder exists
const uploadDir = path.join(__dirname, "../uploads/posts");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname);
    const uid = req.userId || "anon";
    cb(null, `file-${uid}-${ts}${ext}`);
  },
});

// only allow images or videos
const fileFilter = (req, file, cb) => {
  console.log(file.mimetype);
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/")
  ) {
    cb(null, true);
  } else {
    cb(new Error("Only images & videos allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 150 * 1024 * 1024 }, // optional: max 150MB
});

module.exports = upload;
