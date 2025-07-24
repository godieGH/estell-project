const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");
const Post = require("./Post");

class Share extends Model {}

Share.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
    },
    post_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: "posts", key: "id" },
    },
    type: {
      type: DataTypes.ENUM(
        "copy_link",
        "whatsapp_message",
        "whatsapp_status",
        "instagram",
        "twitter",
        "web_share",
      ),
      allowNull: false,
      defaultValue: "copy_link",
    },
  },
  {
    sequelize,
    tableName: "shares",
    modelName: "Share",
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    timestamps: true,
    indexes: [{ fields: ["post_id"] }],
  },
);

Post.hasMany(Share, {
  foreignKey: "post_id",
  as: "shares",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Share.belongsTo(Post, {
  foreignKey: "post_id",
  as: "post",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

module.exports = Share;
