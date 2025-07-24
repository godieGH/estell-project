// models/Participant.js

const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");

class Participant extends Model {}

Participant.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED, // Assuming your User model uses unsigned integers for IDs
      allowNull: false,
      references: {
        model: "users", // Name of the target table (e.g., 'Users' or 'users')
        key: "id",
      },
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "conversations", // Name of the target table (e.g., 'Conversations' or 'conversations')
        key: "id",
      },
    },
    // For group chats, you might want roles (e.g., 'member', 'admin')
    role: {
      type: DataTypes.ENUM("member", "admin", "creator"), // 'creator' can be distinct from 'admin'
      defaultValue: "member",
      allowNull: false,
    },
    // To track when a participant joined the conversation
    joined_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    // To track when a participant last viewed messages in a conversation
    // This helps in determining unread message counts
    last_viewed_at: {
      type: DataTypes.DATE,
      allowNull: true, // Can be null if they haven't viewed yet
    },
    // If a participant can leave a group or be removed
    left_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Participant",
    tableName: "participants",
    timestamps: true,
    updatedAt: "updated_at",
    createdAt: "created_at",
    indexes: [
      {
        unique: true,
        fields: ["user_id", "conversation_id"],
      },
    ],
  },
);

module.exports = Participant;
