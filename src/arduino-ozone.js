
const ui = require('./ui.js')                   // Require is a special built-in function in node js with a special purpose: to load modules
const db = require('./database.js')             // Now these modules are within the search path
const ad = require('./abstract-driver.js')
const bkup = require('./backup.js')

var ardOzoneControlID = 'OzoneControl'
var ardOzoneControlPath = 'config/' + ardOzoneControlID

class ArdOzoneControlC {
  constructor({id, Description = 'Ozone Control', Details = 'Turn lamp on via togglePWM. Set Duty and Period.', router, testFlag = true, debugTest = false}) {
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

    Object.defineProperty(this, 'serialControl', {
      writable: true,
      value: new ad.SerialControl({
        router: router,
        testFlag: this.testFlag,
        timeout: 200,
        debugTest: this.debugTest,
      }),
    })
    /// ////////////////////////////////////////////////////////////////////////////

    Object.defineProperty(this, 'hidden', {
      writable: true,
      value: {
        intensity: new ad.DataPoint({units: '%'}),
        status: 'Disconnected',
        period: new ad.DataPoint({units: 's'}),
        duty: new ad.DataPoint({units: '%'}),
        toggle: false,
      },
    })
    Object.defineProperty(this, 'Intensity', {
      enumerable: true,
      get: () => {
        this.getIntensity().then(() => {
          this.hidden.status = 'Connected'
        }).catch(error => {   // A catch -block contains statements that specify what to do if an exception is thrown in the -try block
          console.log('get Ozone Intensity error')
          console.log(error)
          this.hidden.status = error.toString()
        })
        return (new ui.ShowUser({value: this.hidden.intensity, type: ['input', 'datapoint']}))
      },
    })

    Object.defineProperty(this, 'Status', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: this.hidden.status, type: ['input', 'string']}))
      },
    })

    Object.defineProperty(this, 'Period', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: this.hidden.period, type: ['output', 'datapoint']}))
      },

      set: period => {
        period = Number(period)
        if (period >= 0 && period <= 100) {
          this.setPeriod(period).then(() => {
            this.hidden.status = 'Connected'
          }).catch(error => {
            console.log('SET PERIOD ERROR')
            console.log(error)
            this.hidden.status = error.toString()
          })
        }
      },
    })

    Object.defineProperty(this, 'Duty', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: this.hidden.duty, type: ['output', 'datapoint']}))
      },

      set: val => {
        val = Number(val)
        if (val >= 0 && val <= 100) {
          this.setDuty(val).then(() => {
            this.hidden.status = 'Connected'
          }).catch(error => {
            console.log('SET DUTY ERROR')
            console.log(error)
            this.hidden.status = error.toString()
          })
        }
      },
    })

    Object.defineProperty(this, 'PWM Enable', {
      enumerable: true,
      get: () => {
        return (new ui.ShowUser({value: this.hidden.toggle, type: ['output', 'binary']}))
      },
      set: val => {
        this.hidden.toggle = val

        if (val === true) {
          console.log('TURN ON LED')

          var turnONToggle = '<on:0>'
          this.serialControl.serial(turnONToggle).catch(error => {
            console.log('  Toggle ERROR  ')
            console.log(error)
          })
        } else {
          var turnOFFToggle = '<off:0>'
          console.log('TURN OFF LED')

          this.serialControl.serial(turnOFFToggle).catch(error => {
            console.log('  Toggle ERROR  ')
            console.log(error)
          })
        }
      },

    })
    /// ////////////////////////////////////////////////////////////////////////////
    console.log(testFlag)
    this.datastreams = {refreshRate: 1000}
    this.updateable = []
    this.initialize()
    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'ozone_control_basic',
          fields: ['Intensity',
            'Period',
            'Duty',
            'PWM Enable'],
          obj: this,
          testFlag: this.testFlag,
          objPath: ardOzoneControlPath,
        })},
        path: ardOzoneControlPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }

  /// //////////////////////////////////////////////////////////////////////////
  async getIntensity() {
    var command = ('<q>')
    var resp = await this.serialControl.serial(command, false, 200)
    // console.log(' TEST- MADE IT TO ASYNC ')
    var parts = resp.toString().split(':')
    // console.log(parts)
    var numPart = parts[parts.length - 1].split('>')
    var indexToRemove = 1
    var numberToRemove = 1
    numPart.splice(indexToRemove, numberToRemove)
    // console.log(numPart)
    this.hidden.intensity.value = Number(numPart)
    // onsole.log(" TEST ")
    this.hidden.intensity.time = Date.now()
    this.hidden.status = 'Connected'
  }

  /// //////////////////////////////////////////////////////////////////////////
  async setDuty(val) {
    var command = '<d:' + val.toString() + '>'
    // console.log('setting')
    // console.log(command)
    this.serialControl.serial(command, false, 50).then(() => {
      this.hidden.status = 'Connected'
    }).catch(error => {
      console.log('set duty error')
      console.log(error)
      // this command doesn't give a response, so just set a short timeout and catch the error
    })
  }

  /// //////////////////////////////////////////////////////////////////////////
  async setPeriod(period) {
    var command = '<p:' + period.toString() + '>'
    // console.log('setting')
    // console.log(command)
    this.serialControl.serial(command, false, 50).then(() => {
      this.hidden.status = 'Connected'
    }).catch(error => {
      console.log('set duty error')
      console.log(error)
      // this command doesn't give a response, so just set a short timeout and catch the error
    })
  }

  initialize() {
    //
  }
}

/// ////////////////////////////////////////////////////////////////////////////
var ozoneControlMap = {}
var arduinoLightControlList = ['A']
var ports = ['/dev/tty.usbmodem3203']
var serialLineSerials = ['066AFF3536324D5043022525'] // Arduino Due Prog. Port, System Preferences> USB> USB2.0 Hub

module.exports = {
  initialize: async function (test) {
    test = false
    console.log('Initializing Ozone Control')
    var i = 0
    for (i = 0; i < arduinoLightControlList.length; i++) {
      var arduinolightcontrol = arduinoLightControlList[i]
      // var router = new Board();
      var router = new ad.Router({portPath: ports[i], baud: 115200, testFlag: test, timing: true, manufacturer: 'STMicroelectronics', seriallineSerial: serialLineSerials[i]})
      if (!test) {
        try {
          await router.openPort()
        } catch (error) {
          console.log('Open port error')
          throw error
        }
      }
      ozoneControlMap[arduinolightcontrol] = new ArdOzoneControlC({id: arduinolightcontrol, testFlag: test, router: router, debugTest: false})
    }
    console.log('Ozone Control obj:')
    console.log(ozoneControlMap)
    return
  },
  id: ardOzoneControlID,
  obj: ozoneControlMap = {},
  path: ardOzoneControlPath,
}
