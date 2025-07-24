// models/PasswordResetToken.js

const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db"); // your configured Sequelize instance

class PasswordResetToken extends Model {
  static associate(models) {
    // Each reset token belongs to one user
    PasswordResetToken.belongsTo(models.User, {
      foreignKey: {
        name: "userId",
        allowNull: false,
      },
      onDelete: "CASCADE",
    });
  }
}

PasswordResetToken.init(
  {
    // Primary key
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },

    // Unique JWT ID for one-time use
    jti: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    // Expiration timestamp
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    // Flag to mark if the token has been used
    used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },

    // Foreign key to Users table
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
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
    modelName: "PasswordResetToken",
    tableName: "password_reset_tokens",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    // If you prefer snake_case in the DB:
    // underscored: true,
  },
);

module.exports = PasswordResetToken;
