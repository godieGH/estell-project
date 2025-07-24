const { DataTypes, Model } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");

class UserPreference extends Model {}

UserPreference.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      unique: true, // ensures only one preference entry per user
    },
    preference: {
      type: DataTypes.JSON,
      allowNull: true, // or false if you require JSON always present
    },
  },
  {
    sequelize,
    modelName: "UserPreference", // singular, PascalCase by convention
    tableName: "user_preference", // match your DB table name
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    timestamps: true, // adds createdAt/updatedAt
  },
);

// Associations
UserPreference.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});
User.hasOne(UserPreference, {
  foreignKey: "userId",
  as: "preference",
  onDelete: "CASCADE",
});

module.exports = UserPreference;
