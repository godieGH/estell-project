const { createClient } = require('redis');
require('dotenv').config();

const redis = createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redis.on('error', (err) => {
  console.log('Redis Client Error', err);
});

redis.on('connect', () => {
  console.log(`Redis Connected successfully at redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
});

async function connectRedis() {
  try {
    await redis.connect();
   //console.log(await redis.ping());
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    // You might want to handle this error (e.g., exit the process, retry, etc.)
  }
}

connectRedis();

// You can export the client instance to use in other parts of your application
module.exports = { redis };
