require("dotenv").config();

const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "mysql", ///* one of 'mysql' | 'postgres' | 'sqlite' | 'mariadb' | 'mssql' */
    logging: false,
  },
);

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(
      `Connected to MySQL at ${process.env.DB_HOST}:${process.env.DB_PORT} using Sequelize.`,
    );
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
}

testConnection();

module.exports = sequelize;
