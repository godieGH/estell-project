const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");
const Comment = require("./Comment");

class CommentLike extends Model {}

CommentLike.init(
  {
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "users", key: "id" },
    },
    comment_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: { model: "comments", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "CommentLike",
    tableName: "comment_likes",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "comment_id"],
      },
    ],
  },
);

CommentLike.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
});

CommentLike.belongsTo(Comment, {
  foreignKey: "comment_id",
  as: "comment",
  onDelete: "CASCADE",
});

User.hasMany(CommentLike, {
  foreignKey: "user_id",
  as: "commentLikes", // Alias for when you include this association
  onDelete: "CASCADE", // If a user is deleted, their likes are deleted
});

Comment.hasMany(CommentLike, {
  foreignKey: "comment_id",
  as: "_likes", // Alias for when you include this association
  onDelete: "CASCADE", // If a comment is deleted, its likes are deleted
});

module.exports = CommentLike;
