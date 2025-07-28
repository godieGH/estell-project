// models/Like.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");
const Post = require("./Post");

class Like extends Model {}

// Define the join-table columns
Like.init(
  {
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "users", key: "id" },
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "posts", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "Like",
    tableName: "likes",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "post_id"],
      },
    ],
  },
);

// Set up the two belongsTo’s
Like.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
});
Like.belongsTo(Post, {
  foreignKey: "post_id",
  as: "post",
  onDelete: "CASCADE",
});

module.exports = Like;
