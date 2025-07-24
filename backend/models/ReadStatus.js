// models/ReadStatus.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");

class ReadStatus extends Model {}

ReadStatus.init(
  {
    participant_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: "participants",
        key: "id",
      },
    },
    conversation_id: {
      type: DataTypes.UUID,
      primaryKey: true,
      references: {
        model: "conversations",
        key: "id",
      },
    },
    xxxx: {
       type: DataTypes.STRING(255),
       allowNull: true,
    },
    // Explicitly define created_at and read_at with millisecond precision
    read_at: {
      type: DataTypes.DATE(3), // <--- Add (3) for milliseconds (maps to updatedAt)
      allowNull: false, // Assuming it should always be updated on read
      defaultValue: DataTypes.NOW, // Good to have a default for initial read/creation
    },
    created_at: {
      type: DataTypes.DATE(3), // <--- Add (3) for milliseconds
      allowNull: false, // Assuming it should always be present
      defaultValue: DataTypes.NOW, // Good to have a default for creation
    },
  },
  {
    sequelize,
    tableName: "conversations_read_status",
    modelName: "ReadStatus",
    timestamps: true,
    updatedAt: "read_at", // This column will now be DataTypes.DATE(3)
    createdAt: "created_at", // This column will now be DataTypes.DATE(3)
  },
);

module.exports = ReadStatus;
