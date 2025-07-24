const crypto = require("crypto");
require("dotenv").config();

const algorithm = "aes-256-cbc";
const secretKey = process.env.ENCRYPTION_KEY;

if (!secretKey) {
  console.error("ERROR: ENCRYPTION_KEY environment variable is not set!");
  process.exit(1);
}
if (secretKey.length !== 32) {
  console.error(
    `ERROR: ENCRYPTION_KEY must be 32 characters long for AES-256-CBC. Current length: ${secretKey.length}`,
  );
  process.error(`Current ENCRYPTION_KEY value: "${secretKey}"`);
  process.exit(1);
}

// REMOVE THE GLOBAL IV HERE:
// const iv = crypto.randomBytes(16);

function encrypt(text) {
  // Generate a new IV for EACH encryption
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(text) {
  const textParts = text.split(":");
  if (textParts.length !== 2) {
    throw new Error(
      "Invalid encrypted text format. Expected 'iv:encryptedText'",
    );
  }
  const iv = Buffer.from(textParts[0], "hex"); // Extract IV from the text
  const encryptedText = Buffer.from(textParts[1], "hex");

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey),
    iv,
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
