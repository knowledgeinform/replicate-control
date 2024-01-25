/// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2019 The Johns Hopkins University Applied Physics Laboratory LLC (JHU/APL).  All Rights Reserved.
//
// This material may be only be used, modified, or reproduced by or for the U.S. Government pursuant to the license
// rights granted under the clauses at DFARS 252.227-7013/7014 or FAR 52.227-14. For any other permission, please
// contact the Office of Technology Transfer at JHU/APL: Telephone: 443-778-2792, Internet: www.jhuapl.edu/ott
//
// NO WARRANTY, NO LIABILITY. THIS MATERIAL IS PROVIDED 'AS IS.' JHU/APL MAKES NO REPRESENTATION OR WARRANTY WITH
// RESPECT TO THE PERFORMANCE OF THE MATERIALS, INCLUDING THEIR SAFETY, EFFECTIVENESS, OR COMMERCIAL VIABILITY, AND
// DISCLAIMS ALL WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO) ANY AND ALL
// IMPLIED WARRANTIES OF PERFORMANCE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
// INTELLECTUAL PROPERTY OR OTHER THIRD PARTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE RISK AND LIABILITY
// FOR USING THE MATERIAL. IN NO EVENT SHALL JHU/APL BE LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
// CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR INABILITY TO USE, THE MATERIAL, INCLUDING,
// BUT NOT LIMITED TO, ANY DAMAGES FOR LOST PROFITS.
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ui = require('./ui.js')
const voc = require('./voc.js')
const db = require('./database.js')
const ad = require('./abstract-driver.js')
const bkup = require('./backup.js')

var sperID = 'Conductivity'
var sperPath = 'config/' + sperID

class SPERconductivity {
  constructor({id, Description = '', Details = '', router, testFlag = true, debugTest = false}) {
    // super()
    this.ID = new ui.ShowUser({value: id})
    this.Description = new ui.ShowUser({value: Description})
    this.Details = new ui.ShowUser({value: Details})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    Object.defineProperty(this, 'debugTest', {
      writable: true,
      value: debugTest,
    })

    /// ////////////////////////////////////////////////////////////////////////////
    Object.defineProperty(this, 'hiddenVoltage', {
        writable: true,
        value: new ad.DataPoint({units: ''}),
      })
      Object.defineProperty(this, 'Voltage', {
        enumerable: true,
        get: () => {
          return (new ui.ShowUser({value: this.hiddenVoltage, type: ['input', 'datapoint']}))
        },
      })
    Object.defineProperty(this, 'hiddenConductivity', {
      writable: true,
      value: new ad.DataPoint({units: ''}),
    })
    Object.defineProperty(this, 'Conductivity', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: this.hiddenConductivity, type: ['input', 'datapoint']}))
      },
    })
    Object.defineProperty(this, 'hiddenTemperature', {
        writable: true,
        value: new ad.DataPoint({units: ''}),
      })
      Object.defineProperty(this, 'Temperature', {
        enumerable: true,
        get: () => {
          return (new ui.ShowUser({value: this.hiddenTemperature, type: ['input', 'datapoint']}))
        },
      })
    /// ////////////////////////////////////////////////////////////////////////////
    Object.defineProperty(this, 'hiddenStatus', {
      writable: true,
      value: 'Disconnected',
    })
    Object.defineProperty(this, 'Status', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: this.hiddenStatus, type: ['input', 'string']}))
      },
    })

    /// ////////////////////////////////////////////////////////////////////////////
    // note that in value, the path is intentionally left undefined for now
    console.log(testFlag)
    this.datastreams = {refreshRate: 1000}
    this.updateable = []
    router.parser.on('data', this.parseFrame.bind(this))
    Object.defineProperty(this, 'timeoutTimer', {
        writable: true,
        value: setTimeout(() => {
            this.hiddenStatus = 'Timed out'
          }, this.datastreams.refreshRate * 3)
    })
    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'SPERconductivity_basic',
          fields: ['Voltage', 'Conductivity', 'Temperature'],
          obj: this,
          testFlag: this.testFlag,
          objPath: sperPath,
        })},
        path: sperPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }

  checkLRC(f) {
    var buf = Buffer.from(f)
    // console.log(buf)
    var lrc = 0
    for (var i = 0; i < buf.length - 2; i++) {
        lrc = (lrc + buf[i]) & 0xFF
        // console.log('lrc',lrc,'buf[',i,']',buf[i])
    }
    lrc = ((lrc ^ 0xFF) + 1) & 0xFF
    var lrc_check = Buffer.from(f.substring(f.length - 2), 'hex')
    // console.log('lrc_check',lrc_check.readUint8(),'lrc',lrc,lrc === lrc_check.readUint8())
    return (lrc === lrc_check.readUint8())
  }

  parsePart(part, dp, time) {
    var n = part.match(/-?\d+\.?\d*/)
    dp.value = Number(n[0])
    var parts2 = part.split(n[0])
    if (parts2[1].length > 3) {
        var parts3 = parts2[1].split(' ')
        dp.units = parts3[0]
    } else {
        dp.units = parts2[1]
    }
    dp.time = time
  }

  parseFrame(f) {
    var time = Date.now()
    if (f[0] === '$') return

    // console.log('probe frame')
    // console.log(f)
    if (this.checkLRC(f)) {
        var parts = f.split(':')
        // console.log(parts)

        this.parsePart(parts[1], this.hiddenVoltage, time)
        this.parsePart(parts[2], this.hiddenConductivity, time)
        this.parsePart(parts[6], this.hiddenTemperature, time)
        
    }
    if (!this.testFlag) {
        this.timeoutTimer.refresh()
        this.hiddenStatus = 'Connected'
    }
  }

  initialize() {
    // not currently used
  }
}

var sperCondMap = {}
var sperCondList = ['A']
var ports = ['COM23']
var seriallineSerials = ['20220915137']

module.exports = {
  initialize: async function (test) {
    // test = false
    console.log('intializing SPERconductivitys')
    var i = 0
    for (i = 0; i < sperCondList.length; i++) {
      var sperCond = sperCondList[i]
      var router = new ad.Router({
        portPath: ports[i],
        baud: 9600,
        testFlag: test,
        delimiter: '\r\n',
        manufacturer: 'Silicon Labs',
        seriallineSerial: seriallineSerials[i],
      })
      if (!test) {
        try {
          await router.openPort()
        } catch (error) {
          console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
          throw error
        }
      }
      sperCondMap[sperCond] = new SPERconductivity({id: sperCond, testFlag: test, router: router, debugTest: false})
    }

    return
  },
  id: sperID,
  obj: sperCondMap,
}

// async function f() {
//   var test = false
//   for (i = 0; i < sperCondList.length; i++) {
//     var oxi = sperCondList[i]
//     var router = new ad.Router({portPath: ports[i], baud: 9600, testFlag: test, timing: true, manufacturer: 'Prolific', seriallineSerial: serialLineSerials[i]})
//     if (!test) {
//       try {
//         await router.openPort()
//       } catch (error) {
//         console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
//         throw error
//       }
//     }
//     sperCondMap[oxi] = new SPERconductivity({id: oxi, testFlag: test, router: router, debugTest: true})
//   }

//   setInterval(() => {
//     console.log(sperCondMap['A'].Conductivity)
//   }, 500)
// }

// console.log('Waiting 4 s for serial devices')
// setTimeout(f, 4000)
