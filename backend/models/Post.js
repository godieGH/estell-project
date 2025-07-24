// model/Post.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db"); // your configured Sequelize instance

class Posts extends Model {}

Posts.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: "user_id",
    },
    type: {
      type: DataTypes.ENUM("text", "image", "video"),
      allowNull: false,
      defaultValue: "text",
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mediaUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "media_url",
    },
    thumbnailUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    originalMedia: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    linkUrl: {
      type: DataTypes.JSON,
      allowNull: true,
      field: "link_url",
    },
    status: {
      type: DataTypes.ENUM("published", "draft", "archived"),
      allowNull: false,
      defaultValue: "published",
    },
    audience: {
      type: DataTypes.ENUM("public", "friends", "unlisted", "private"),
      allowNull: false,
      defaultValue: "public",
    },
    category: {
      type: DataTypes.STRING(255),
      allowNull: null,
    },
    location: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    allow_comments: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    likeCounts: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "like_counts",
    },
    keywords: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    scheduleAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Posts",
    tableName: "posts",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Posts;
