/* eslint-disable no-unused-vars */
const options = require('../src/config/options.js')
const mongoConn = require('./MongoConnection')
const isodate = require('isodate')

var myobj = []
/* eslint-disable no-debugger, no-console */
const MongoUpdater = require('./mongo-updater')
module.exports = {
  addInterferogram(test) {
    MongoUpdater.addInterferogramB(test)
  },
  addMeasurement(test) {
    // console.log('testF')
    MongoUpdater.processMeasurement(test)
  },
  getDatabase(collectionName, startDate, endDate, limit, offset) {
    console.log('parameters=>', collectionName, startDate, endDate, limit, offset)
    const dbConn = mongoConn.getConnection()
    if (!dbConn) {
      console.log('DB conncection failed')
      return
    }

    return new Promise((resolve, reject) => {
      dbConn.collection(collectionName).find({
        timestamp: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }).limit(limit).skip(offset).toArray((error, result) => {
        if (error) {
          reject(error)
        } else {
          console.log('something retrieved', result.length)
          resolve(result)
        }
      })
    })
  },
}
