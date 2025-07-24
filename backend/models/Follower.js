// models/Follower.js
const { Model, DataTypes } = require("sequelize");
const sequelize = require("../db");

class Follower extends Model {}

Follower.init(
  {
    follower_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    followee_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: "Follower",
    tableName: "followers",
    timestamps: false,
  },
);

module.exports = Follower;
