// models/User.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db"); // your configured Sequelize instance

class User extends Model {}

User.init(
  {
    // Primary key
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true,
    },

    // Core user fields
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email_verify_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    account_status: {
      type: DataTypes.ENUM("system", "google"),
      allowNull: false,
      defaultValue: "system",
    },

    // Meta fields (formerly in UserMeta)
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    avatar: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
      charset: "utf8mb4",
      collate: "utf8mb4_unicode_ci",
    },
    contact: {
      type: DataTypes.JSON,
      allowNull: true,
    },

    // Token for session refreshes (optional)
    refresh_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Timestamps
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "User",
    tableName: "users",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    // If you want to snake-case your timestamp columns in the DB:
    // underscored: true,
  },
);

module.exports = User;
