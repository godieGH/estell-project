// models/Conversation.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");

class Conversation extends Model {}

Conversation.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM("private", "group"),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    creator_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    participants_array: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    last_message_at: {
      type: DataTypes.DATE(3), // <--- CHANGE THIS TO DATETIME(3) for milliseconds
      allowNull: true,
    },
    last_message_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Explicitly define created_at and updated_at with millisecond precision
    // as you've mapped them below
    created_at: {
      type: DataTypes.DATE(3), // <--- Add (3) for milliseconds
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE(3), // <--- Add (3) for milliseconds
      allowNull: false,
    }
  },
  {
    sequelize,
    modelName: "Conversation",
    tableName: "conversations",
    timestamps: true,
    updatedAt: "updated_at",
    createdAt: "created_at",
  },
);

module.exports = Conversation;
