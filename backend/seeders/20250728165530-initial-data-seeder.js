'use strict';

/** @type {import('sequelize-cli').Migration} */

const { faker } = require('@faker-js/faker')
const argon2 = require("argon2");

async function seedUsers(a) {
   const users = [];
   const count = parseInt(a);
   
   const hash = await argon2.hash("@123abcD");
   
   for(let i=0;i<count;i++) {
      const sex = faker.person.sexType()
      const fname = faker.person.firstName(sex)
      const lname = faker.person.lastName(sex)
      
      const email = faker.internet.email({firstName: fname, lastName: lname, provider: 'example.com'})
      
      users.push({
         name: `${fname} ${lname}`,
         email: email,
         password_hash: hash,
         email_verify_status: true,
         username: faker.internet.username({firstName: fname, lastName: lname}),
         avatar: null,
         bio: null,
         contact: null,
      })
   }
   
   return users;
}


module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.bulkInsert('users', await seedUsers(5), {})
  },

  async down (queryInterface, Sequelize) {
    queryInterface.bulkDelete('users', null, {})
  }
};

