const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./User");
const Post = require("./Post");

class Comment extends Model {}

Comment.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "posts", key: "id" },
    },
    commenter_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: "users", key: "id" },
    },
    comment_body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    parent_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: "comments", key: "id" },
    },
  },
  {
    sequelize,
    modelName: "Comment",
    tableName: "comments",
    timestamps: true,
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
  },
);

Post.hasMany(Comment, {
  foreignKey: "post_id",
  as: "comments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

User.hasMany(Comment, {
  foreignKey: "commenter_id",
  as: "comments",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Comment.belongsTo(Post, {
  foreignKey: "post_id",
  as: "post",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Comment.belongsTo(User, {
  foreignKey: "commenter_id",
  as: "commenter",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Comment.belongsTo(Comment, {
  foreignKey: "parent_id",
  as: "parent",
});
Comment.hasMany(Comment, {
  foreignKey: "parent_id",
  as: "replies",
});

module.exports = Comment;
