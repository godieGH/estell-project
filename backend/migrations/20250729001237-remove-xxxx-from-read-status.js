'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    
    await queryInterface.removeColumn('conversations_read_status', 'xxxx');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('conversations_read_status', 'xxxx', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  }
};
