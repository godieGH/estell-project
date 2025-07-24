const express = require("express");
const router = express.Router();
const upload = require("../middleware/multerConfig");
const { authenticateAccess } = require("../middleware/JwtAccessTokenAuth");
const { User, PasswordResetToken, UserPreference } = require("../models");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const argon2 = require("argon2");
const crypto = require("crypto");

const {
  loginController,
  registerController,
  verifyEmailController,
  tokenRefreshController,
  editProfilePicController,
  editProfileController,
} = require("../controllers/UserController");

// 1. validation & sanitization chain
const registrationValidation = [
  body("name")
    .trim()
    .isLength({
      min: 3,
    })
    .withMessage("Name must be at least 3 characters")
    .escape(),
  body("email").isEmail().withMessage("Must be a valid email").normalizeEmail(),
  body("password")
    .isLength({
      min: 8,
    })
    .withMessage("Password must be at least 8 characters"),
];

router.post("/register", registrationValidation, registerController);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // 15 min
  max: 8,
  //I will use 5 in for security in production
  // block after 5 attempts
  message: "Too many login attempts, please try again later.",
});
const loginValidation = [
  body("email").isEmail().withMessage("Must be a valid email").normalizeEmail(),
  body("password")
    .isLength({
      min: 8,
    })
    .withMessage("Password must be at least 8 characters"),
];

router.post("/login", loginLimiter, loginValidation, loginController);

router.get("/verify-email", verifyEmailController);

router.post("/token/refresh", tokenRefreshController);

router.post("/logout", async (req, res, next) => {
  const { email } = req.body;

  // Clear the 'refresh_token' cookie
  await res.clearCookie("refresh_token", {
    httpOnly: true,
    sameSite: "none", //'Strict',
    secure: true, // process.env.NODE_ENV === 'production',
    path: "/",
  });
  try {
    const user = await User.findOne({
      where: {
        email,
      },
    });

    user.refresh_token = null;
    await user.save();

    // Clear the 'userPreferences' cookie
    //res.clearCookie('userPreferences');

    // Optionally, send a response back to the client
    res.json({
      message: "Logged out successfully. Cookies cleared.",
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/upload/profile-picture",
  authenticateAccess,
  upload.single("avatar"),
  editProfilePicController,
);

router.post("/edit/profile", authenticateAccess, editProfileController);

router.post("/username/check", authenticateAccess, async (req, res) => {
  const { username } = req.body;
  const userId = req.userId; // set by authenticateAccess

  // 1. Basic format validation
  if (!username || typeof username !== "string") {
    return res.status(400).json({
      available: false,
      message: "Username is required",
    });
  }
  if (username.length < 4) {
    return res.status(400).json({
      available: false,
      message: "Must be at least 4 characters",
    });
  }
  if (!/^[a-z0-9._]+$/.test(username)) {
    return res.status(400).json({
      available: false,
      message: 'Only lowercase letters, numbers, "." and "_" allowed',
    });
  }

  try {
    // 2. Check if another user already has this username
    const existing = await User.findOne({
      where: { username },
    });

    // If found and it's not the current user, it's taken
    if (existing && existing.id !== userId) {
      return res.json({
        available: false,
        message: "Username already taken",
      });
    }

    // Otherwise it's free (or it’s the user’s own current username)
    return res.json({
      available: true,
      message: "Username available",
    });
  } catch (err) {
    console.error("Username check error:", err);
    return res.status(500).json({
      available: false,
      message: "Server error during username check",
    });
  }
});

router.post("/search", authenticateAccess, async (req, res) => {
  let { q } = req.body;
  const requesterId = req.userId;

  // 1. Validate
  if (!q || typeof q !== "string") {
    return res.status(400).json({ error: "Invalid query parameter" });
  }
  q = q.toLowerCase().trim();
  if (q.length < 1) {
    return res.json([]); // nothing to search
  }

  try {
    // 2. Find up to 10 users whose username starts with the query, case-insensitive
    const matches = await User.findAll({
      attributes: ["id", "username"],
      where: {
        id: { [Op.ne]: requesterId }, // exclude yourself
        username: { [Op.like]: `${q}%` }, // Postgres ILIKE for case-insensitive
      },
      order: [["username", "ASC"]],
      limit: 5,
    });

    // 3. Return just the array of matches
    return res.json(matches);
  } catch (err) {
    console.error("User search error:", err);
    return res.status(500).json({ error: "Server error during user search" });
  }
});

const forgot_password_limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many password reset requests, please try again later.",
  keyGenerator: function (req) {
    return req.body.email; // Key by email for forgot password
  },
});

router.post("/forgot/password", forgot_password_limiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({
      where: { email },
    });

    if (!user) {
      return res
        .status(200) // Return 200 to avoid revealing whether the email exists
        .json({
          message: "If that email is registered, a reset link has been sent.",
        });
    }

    // 1. Generate a JWT reset token
    const jti = crypto.randomUUID();
    const resetToken = jwt.sign(
      {
        sub: user.id,
        email,
        type: "PASSWORD_RESET",
        jti,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.PASSWORD_RESET_SECRET,
      { expiresIn: "1h" },
    );

    // 2. Store the JTI with its expiry in the database
    await PasswordResetToken.create({
      userId: user.id,
      jti,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      used: false,
    });

    // 3. Construct the reset link
    const resetLink = `${process.env.CLIENT}/auth/reset/password/${resetToken}`;

    // 4. Send (or log) the email
    console.log(`Sending reset link to ${email}: ${resetLink}`);
    // In production, replace console.log with your mailing service call:
    // await mailer.sendPasswordReset(email, resetLink);

    return res.status(200).json({
      message:
        "If that email is registered, A reset link has been sent. Please check your emails to reset your password.",
    });
  } catch (err) {
    console.error("Error in /forgot/password:", err);
    return res
      .status(500)
      .json({ message: err.message || "Failed to initiate password reset." });
  }
});

const reset_password_limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: "Too many password reset attempts, please try again later.",
});

router.get(
  "/reset/password/:token",
  reset_password_limiter,
  async (req, res) => {
    try {
      const { token } = req.params;

      // 1) Verify signature and expiration
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);
      } catch (jwtErr) {
        // If token is malformed or expired, jwt.verify throws
        console.error("JWT verification failed:", jwtErr);
        return res.status(401).json({ msg: "Invalid or expired token!" });
      }

      // 2) Look up the token’s JTI in the database
      let tokenRecord;
      try {
        tokenRecord = await PasswordResetToken.findOne({
          where: { jti: decoded.jti, userId: decoded.sub },
        });
      } catch (dbErr) {
        // A real database error → respond 500
        console.error("Database error when finding reset token:", dbErr);
        return res
          .status(500)
          .json({ msg: "Something went wrong. Please try again later." });
      }

      // 3) Check that the token is the right type, exists, not used, and not expired
      if (
        decoded.type !== "PASSWORD_RESET" ||
        !tokenRecord ||
        tokenRecord.used ||
        tokenRecord.expiresAt < new Date()
      ) {
        return res.status(401).json({ msg: "Invalid or expired token!" });
      }

      // 4) If we reach here, everything is okay
      return res.json({ decoded });
    } catch (err) {
      // Any other unexpected exception (should be rare, but just in case)
      console.error("Unexpected error in /reset/password/:token:", err);
      return res
        .status(500)
        .json({ msg: "Internal server error. Please try again later." });
    }
  },
);

const validateResetPassword = [
  // Check that newPassword exists and meets complexity requirements
  body("newPassword")
    .exists({ checkFalsy: true })
    .withMessage("newPassword is required.")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be between 8 and 128 characters.")
    .matches(/^(?=.*[a-z])/, "i")
    .withMessage("Password must contain at least one lowercase letter.")
    .matches(/^(?=.*[A-Z])/, "i")
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/^(?=.*\d)/)
    .withMessage("Password must contain at least one digit."),

  // Middleware to collect and return validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

router.post("/reset/password", validateResetPassword, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ msg: "Token and newPassword are required." });
    }

    // 1. Verify JWT signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);
    } catch (err) {
      console.error(err);
      return res.status(401).json({ msg: "Invalid or expired token!" });
    }

    // 2. Look up the matching token record by JTI and userId
    const tokenRecord = await PasswordResetToken.findOne({
      where: {
        jti: decoded.jti,
        userId: decoded.sub,
      },
    });

    // 3. Validate type, existence, “used” flag, and expiry
    if (
      decoded.type !== "PASSWORD_RESET" ||
      !tokenRecord ||
      tokenRecord.used ||
      tokenRecord.expiresAt < new Date()
    ) {
      return res.status(401).json({ msg: "Invalid or expired token!" });
    }

    // 4. Hash the new password and update the user record
    const hashedPassword = await argon2.hash(newPassword);
    await User.update(
      { password_hash: hashedPassword },
      { where: { id: decoded.sub } },
    );

    // 5. Mark the token as used so it cannot be reused
    tokenRecord.used = true;
    await tokenRecord.save();

    return res.json({ msg: "Password has been reset. You can now log in." });
  } catch (err) {
    console.error("Error in POST /reset/password:", err);
    return res
      .status(500)
      .json({ msg: "Server error while resetting password." });
  }
});

router.get("/preference/", authenticateAccess, async (req, res) => {
  const userId = req.userId;
  const preference = await UserPreference.findOne({ where: { userId } });
  if (!preference) {
    res.json({
      dark: false,
      push: true,
      email: true,
      autoplay: false,
      mute: false,
    });
  }
  res.json(preference.preference);
});

router.patch("/preference/", authenticateAccess, async (req, res) => {
  try {
    const userId = req.userId;
    const entries = Object.entries(req.body);

    if (entries.length !== 1) {
      return res
        .status(400)
        .json({ error: "Request body should have exactly one key" });
    }

    const [key, rawVal] = entries[0];

    // Parse/coerce rawVal into a boolean:
    let val;
    if (typeof rawVal === "boolean") {
      val = rawVal;
    } else if (typeof rawVal === "string") {
      const lower = rawVal.toLowerCase().trim();
      if (lower === "true") {
        val = true;
      } else if (lower === "false") {
        val = false;
      } else {
        return res.status(400).json({
          error: `Invalid value for '${key}': must be boolean ('true' or 'false')`,
        });
      }
    } else {
      // You could also accept numbers like 1/0 if desired:
      return res.status(400).json({
        error: `Invalid type for '${key}': must be boolean or string 'true'/'false'`,
      });
    }

    // Now val is a true boolean.
    // Fetch existing preference record
    const preference = await UserPreference.findOne({ where: { userId } });

    if (!preference) {
      // Create a new preference row with this single key
      await UserPreference.create({
        userId,
        preference: {
          [key]: val,
        },
      });
      return res
        .status(200)
        .json({ message: "Preference added", preference: { [key]: val } });
    }

    // Update existing JSON preference: merge previous object with new key/value
    // Note: depending on your dialect and the type of the `preference` column (e.g., JSON/JSONB in Postgres),
    // you might be able to do a more atomic JSON merge at the DB level. Here we read-modify-write.
    const updatedPrefObject = {
      ...preference.preference, // existing object
      [key]: val,
    };

    await UserPreference.update(
      { preference: updatedPrefObject },
      { where: { userId } },
    );

    return res
      .status(200)
      .json({ message: "Preference updated", preference: updatedPrefObject });
  } catch (err) {
    // If err.status is not set, default to 500
    const statusCode = err.status || 500;
    console.error("Error in PATCH /preference:", err);
    return res
      .status(statusCode)
      .json({ error: `An error occurred: ${err.message}` });
  }
});

module.exports = router;
