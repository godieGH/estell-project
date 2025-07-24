const fs = require("fs");
const path = require("path");
//const {User} = require("../models")
const { sequelize, User } = require("../models");
const { ValidationError, UniqueConstraintError } = require("sequelize");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

// helper: generate random username
const RANDOM_CHARS = "abcdefghijklmnopqrstuvwxyz._";
function generateUsername(email, randomLength = 5) {
  if (typeof email !== "string" || !email.includes("@")) {
    throw new Error("Valid email address is required");
  }

  // 1. Extract the handle (part before the @)
  const handle = email.split("@")[0];

  // 2. Generate `randomLength` random chars from RANDOM_CHARS
  let suffix = "";
  for (let i = 0; i < randomLength; i++) {
    const idx = Math.floor(Math.random() * RANDOM_CHARS.length);
    suffix += RANDOM_CHARS.charAt(idx);
  }

  // 3. Combine handle and random suffix
  return `${handle}${suffix}`;
}

exports.registerController = async (req, res, next) => {
  // 1. handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      errors: errors.array(),
    });
  }

  const { name, email, password } = req.body;

  try {
    // 2. check if email already exists
    const existing = await User.findOne({
      where: {
        email,
      },
    });
    if (existing) {
      return res.status(409).json({
        error: "Email already registered",
      });
    }

    // 3. hash the password
    const hash = await argon2.hash(password);

    // 4. generate a unique username (you may want to loop/check collision in prod)
    const username = generateUsername(email, 6);

    // 5. create the user with meta fields
    const newUser = await User.create({
      name,
      email,
      password_hash: hash,
      email_verify_status: false,
      account_status: "system",
      username, // pre-assigned random username
      avatar: null, // or your default avatar URL
      bio: null,
      contact: null,
    });

    // 6. generate a one-time JWT for email verification
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        type: "email_verification",
        issuedAt: Date.now(),
      },
      process.env.EMAIL_TOKEN_SECRET,
      {
        expiresIn: "1h",
      },
    );

    // 7. log or email the verification link
    const verificationLink = `${process.env.BASE_URL}/users/verify-email?token=${token}`;
    console.log("Email verification link:", verificationLink);
    // TODO: send via your mailer instead of console.log

    // 8. respond
    res.status(201).json({
      userId: newUser.id,
      username: newUser.username,
      message: "User created. Verification link sent.",
    });
  } catch (err) {
    console.error("Registration error:", err);
    next(err);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

exports.loginController = async (req, res, next) => {
  // 1. Handle validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      errors: errors.array(),
    });
  }

  const { email, password } = req.body;

  try {
    // 2. Lookup user
    const user = await User.findOne({
      where: {
        email,
      },
    });
    if (!user) {
      // don’t reveal whether email exists
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // 3. Check email verified
    if (!user.email_verify_status) {
      return res.status(403).json({
        error: "Email not verified",
      });
    }

    // 4. Verify password (Argon2)
    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      return res.status(401).json({
        error: "Invalid credentials",
      });
    }

    // 5. Generate tokens
    const accessToken = jwt.sign(
      {
        userId: user.id,
        type: "access",
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    //console.log(accessToken)
    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: "refresh",
      },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      },
    );

    // 6. Persist refresh token (in DB or in-memory store)
    user.refresh_token = refreshToken;
    await user.save();

    // 7. Set HttpOnly, SameSite cookie for refresh token
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "none", //'Strict',
      secure: true, // process.env.NODE_ENV === 'production',
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 8. Send access token
    res.json({
      accessToken,
      user: {
        name: user.name,
        username: user.username,
        email: user.email,
        contact:
          user.contact === null || user.contact === ""
            ? {
                phone: "",
                blog: "",
                twitter: "",
              }
            : user.contact,
        bio: user.bio,
        avatar: user.avatar,
      },
    });

    // 9. Optional: log the successful login
    console.log(`User ${user.id} logged in at ${new Date().toISOString()}`);
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      error: "Internal server error",
    });
    next(err);
  }
};

exports.verifyEmailController = async (req, res) => {
  const { token } = req.query;

  // 1. Check token presence
  if (!token) {
    return res.status(400).json({
      error: "Verification token is required",
    });
  }

  try {
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.EMAIL_TOKEN_SECRET);

    // 3. Ensure token type is correct
    if (decoded.type !== "email_verification") {
      return res.status(400).json({
        error: "Invalid token type",
      });
    }

    // 4. Lookup user
    const user = await User.findByPk(decoded.userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    // 5. Check if already verified
    if (user.email_verify_status) {
      return res.status(200).json({
        message: "Email already verified",
      });
    }

    // 6. Update verification status
    user.email_verify_status = true;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
    });
  } catch (err) {
    console.error("Verification error:", err);
    res.status(400).json({
      error: "Invalid or expired token",
    });
  }
};

exports.tokenRefreshController = async (req, res, next) => {
  try {
    // 1. Grab the refresh token from the HttpOnly cookie
    const refreshToken = req.cookies["refresh_token"];
    if (!refreshToken) {
      return res.status(401).json({
        error: "No refresh token provided",
      });
    }

    // 2. Verify the refresh token’s signature & expiry
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      console.log(err.message);
      return res.status(403).json({
        error: "Invalid or expired refresh token",
      });
    }

    // 3. Lookup the user & compare stored token
    const user = await User.findByPk(payload.userId);
    if (!user || user.refresh_token !== refreshToken) {
      return res.status(403).json({
        error: "Refresh token mismatch",
      });
    }

    // 4. Issue a brand-new access token
    const newAccessToken = jwt.sign(
      {
        userId: user.id,
        type: "access",
      },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "15m",
      },
    );

    res.json({
      accessToken: newAccessToken,
      user: {
        name: user.name,
        username: user.username,
        email: user.email,
        contact:
          user.contact === null || user.contact === ""
            ? {
                phone: "",
                blog: "",
                twitter: "",
              }
            : user.contact,
        bio: user.bio,
        avatar: user.avatar,
        id: user.id,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.editProfilePicController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: "No file uploaded.",
      });
    }

    // Get user record
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    // If user has an existing avatar, try deleting it
    if (user.avatar) {
      const oldAvatarPath = path.join(__dirname, "..", "uploads", user.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        await fs.unlinkSync(oldAvatarPath); // delete the file
      }
    }

    // Update avatar in DB
    await User.update(
      {
        avatar: req.file.filename,
      },
      {
        where: {
          id: req.userId,
        },
      },
    );

    res.status(200).json({
      message: "Avatar uploaded successfully.",
      filename: req.file.filename,
    });
  } catch (error) {
    console.error("Upload or DB update failed:", error);
    res.status(500).json({
      error: "Server error. Please try again.",
    });
  }
};

exports.editProfileController = async (req, res, next) => {
  const { name, username, bio, contact } = req.body;
  // 1. Basic input validation (can be extracted into middleware)
  const errors = [];
  if (username !== undefined) {
    if (typeof username !== "string" || username.trim().length < 4) {
      errors.push("Username must be a string of at least 4 characters");
    }
    if (username.length > 15) {
      errors.push("Username Too long.");
    }
    if (!/^[a-z0-9._]+$/.test(username)) {
      errors.push(
        'Username may only contain lowercase letters, numbers, "." and "_"',
      );
    }
  }
  if (errors.length) {
    return res.status(400).json({ success: false, errors });
  } // 7

  try {
    // 2. Start a managed transaction
    await sequelize.transaction(async (transaction) => {
      // 3. Fetch & lock the user row
      const user = await User.findByPk(req.userId, {
        transaction,
        lock: transaction.LOCK.UPDATE, // 8
      });
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found." });
      }

      // 4. Prepare updates only for non-empty fields
      const updates = {};
      if (typeof name === "string" && name.trim()) updates.name = name.trim();
      if (typeof username === "string" && username.trim())
        updates.username = username.trim();
      if (typeof bio === "string") updates.bio = bio;
      if (typeof contact === "object") updates.contact = contact;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided for update.",
        });
      } // 9

      // 5. Username uniqueness check
      if (updates.username) {
        const existing = await User.findOne({
          where: { username: updates.username },
          transaction,
        });
        if (existing && existing.id !== user.id) {
          return res
            .status(400)
            .json({ success: false, message: "Username already taken." });
        } // 10
      }

      // 6. Perform the update
      await user.update(updates, { transaction }); // 11

      // 7. Return the refreshed user
      const refreshed = await User.findByPk(user.id, { transaction });
      return res.status(200).json({ success: true, data: refreshed });
    });
  } catch (err) {
    // 8. Error handling
    if (
      err instanceof ValidationError ||
      err instanceof UniqueConstraintError
    ) {
      return res
        .status(400)
        .json({ success: false, errors: err.errors.map((e) => e.message) });
    }
    // Pass all other errors to centralized error middleware
    return next(err); // 12
  }
};
