const Redis = require('ioredis')
require('dotenv').config()

const redis = new Redis({
   host: process.env.REDIS_HOST,
   port: process.env.REDIS_PORT
})

redis.on('error', (err) => {
   console.log('Redis Err:', err)
})

redis.on('connect', () => {
   console.log(`Redis Connected successifully at redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)
})

module.exports = {
   redis
}