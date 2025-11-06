'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Packages', [
      {
        name: 'Free',
        price: 0,
        durationDays: 9999, // Essentially unlimited for a free plan
        maxDevices: 1,
        messageLimit: 50,
        apiAccess: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Premium',
        price: 15000,
        durationDays: 30,
        maxDevices: 20,
        messageLimit: 99999,
        apiAccess: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Packages', null, {});
  },
};
