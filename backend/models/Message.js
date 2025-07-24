// models/Message.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");

class Message extends Model {}

Message.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    conversation_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    sender_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    sender_type: {
      type: DataTypes.ENUM("user", "system"),
      allowNull: false,
    },
    content: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    is_edited: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reply_to_message_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "messages",
        key: "id",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    // Explicitly define sent_at here with millisecond precision
    sent_at: {
      type: DataTypes.DATE(3), // <--- THIS IS THE CRUCIAL CHANGE
      allowNull: false,
      // You can also add a defaultValue if you want, though Sequelize's timestamps will handle it
      // defaultValue: DataTypes.NOW, // This would apply if timestamps: false
    },
    // If you also want updated_at with milliseconds:
    updated_at: {
      type: DataTypes.DATE(3), // <--- And this for updated_at if you track edits precisely
      allowNull: false,
    }
  },
  {
    sequelize,
    modelName: "Message",
    tableName: "messages",
    timestamps: true,
    createdAt: "sent_at", // Sequelize will now use the sent_at column defined above
    updatedAt: "updated_at", // Sequelize will use the updated_at column defined above
    // If you remove timestamps: true and manually manage sent_at,
    // you would set defaultValue: DataTypes.NOW on sent_at.
  },
);

module.exports = Message;
