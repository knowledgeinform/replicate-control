// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
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
// //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const ad = require('./abstract-driver.js')
const db = require('./database.js')
const bkup = require('./backup.js')
const ui = require('./ui.js')
const adam = require('./adam-4019f.js')

class ControlAdam {
  constructor({address = '01',
    router,
    testFlag = false,
    services,
    server,
    configPath,
  }) {
    this.Address = {value: address} // added, capitalized and wrapped for backup.js/database.js
    this.device = new adam.Adam4019F({address, router, testFlag})
    this.configPath = configPath
    this.retryNumber = 0

    //Where data is updated to and stored in hidden variable, numerPVs is the link to output in "controllers.js"
    this.hidden = {
      processValue: [new ad.DataPoint({value: 0, units: 'psia'}), new ad.DataPoint({value: 0, units: 'psia'}), new ad.DataPoint({value: 0, units: 'psia'}), new ad.DataPoint({value: 0, units: 'psia'})],
    }

    this.services = services
    this.server = server

    //Increase when adding more PVs to update GUI
    this.numberPVs = 4




    this.lockRefreshInterval = true
    this.maxRefreshInterval = 300


    this.AdditionalFields = {
      Enable: new ui.ShowUser({value: false, type: ['output', 'binary']}),
    }
    if (this.configPath !== undefined) {
      this.AdditionalFields.Database = new ui.ShowUser({
        value: [{
          id: 'Settings',
          obj: {0: new db.GUI({
            measurementName: 'adam_pressure',
            fields: ['PV0',
              'PV1',
              'PV2',
              'PV3'],
            obj: this,
            testFlag: this.testFlag,
            objPath: this.configPath,
          })},
          path: this.configPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
        }],
        type: ['output', 'link'],
      })
      this.getStaticSettings()
    }

  }

  getStaticSettings() {
    var cMap = bkup.load(this.configPath)
    console.log('Loaded controller map')
    console.log(cMap)
    // if (Object.prototype.hasOwnProperty.call(cMap, this.device.address)) {
    //   var thisObj = cMap[this.device.address]
    //   console.log('Loading static settings')
    //   console.log(thisObj)
    //   if (Object.prototype.hasOwnProperty.call(thisObj, 'k_p')) this.ctr.kp = thisObj.k_p.value
    //   if (Object.prototype.hasOwnProperty.call(thisObj, 'k_i')) this.ctr.ki = thisObj.k_i.value
    //   if (Object.prototype.hasOwnProperty.call(thisObj, 'k_d')) this.ctr.kd = thisObj.k_d.value
    // }
  }



  get PV0() {
    if (Date.now() - this.hidden.processValue[0].time < this.maxRefreshInterval && this.lockRefreshInterval) {
      return this.hidden.processValue[0]
    }

    this.device.getChannelInput(0).then(() => {
      var temp_var = this.device.hidden.channels[0].input
      var voltage = temp_var.value
      var pressure_bar = (voltage-0.1)*6.0/(10 - 0.1)
      var pressure_psia = pressure_bar*14.5038
      temp_var.value = pressure_psia
      // console.log(`PT0 = ${temp_var.value}`)

      this.hidden.processValue[0] = temp_var
      // this.hidden.processValue[0] = this.device.hidden.channels[0].input
    }).catch(error => {
      console.log('get PV0 error')
      console.log(error)
    })
    return this.hidden.processValue[0]
  }

  get PV1() {
    if (Date.now() - this.hidden.processValue[1].time < this.maxRefreshInterval && this.lockRefreshInterval) {
      return this.hidden.processValue[1]
    }

    this.device.getChannelInput(1).then(() => {
      var temp_var = this.device.hidden.channels[1].input
      var voltage = temp_var.value
      var pressure_bar = (voltage-0.1)*10.0/(10 - 0.1)
      var pressure_psia = pressure_bar*14.5038
      temp_var.value = pressure_psia


      this.hidden.processValue[1] = temp_var

    }).catch(error => {
      console.log('get PV1 error')
      console.log(error)
    })
    return this.hidden.processValue[1]
  }

  get PV2() {
    if (Date.now() - this.hidden.processValue[2].time < this.maxRefreshInterval && this.lockRefreshInterval) {
      return this.hidden.processValue[2]
    }

    this.device.getChannelInput(2).then(() => {
      var temp_var = this.device.hidden.channels[2].input
      var voltage = temp_var.value
      var pressure_bar = (voltage-0.1)*10.0/(10 - 0.1)
      var pressure_psia = pressure_bar*14.5038
      temp_var.value = pressure_psia

      this.hidden.processValue[2] = temp_var
    }).catch(error => {
      console.log('get PV2 error')
      console.log(error)
    })
    return this.hidden.processValue[2]
  }

  get PV3() {
    if (Date.now() - this.hidden.processValue[3].time < this.maxRefreshInterval && this.lockRefreshInterval) {
      return this.hidden.processValue[3]
    }

    this.device.getChannelInput(3).then(() => {
      var temp_var = this.device.hidden.channels[3].input
      var voltage = temp_var.value
      var pressure_bar = (voltage-0.1)*6.0/(10 - 0.1)
      var pressure_psia = pressure_bar*14.5038
      temp_var.value = pressure_psia

      // console.log(`PT3 = ${temp_var.value}`)

      this.hidden.processValue[3] = temp_var
    }).catch(error => {
      console.log('get PV3 error')
      console.log(error)
    })
    return this.hidden.processValue[3]
  }


  

  initialize() {
    var channels = [0,1,2,3]

    for (var channel of channels){
      this.device.getChannelType(channel).then(() => {
        this.device.hidden.channels[0].input.units = 'psia'
        this.device.hidden.channels[1].input.units = 'psia'
        this.device.hidden.channels[2].input.units = 'psia'
        this.device.hidden.channels[3].input.units = 'psia'
      }).catch(error => {
        // pulls in the units for temperature (C)
        console.log('error getting channel type on init')
        console.log(error)
        var retryWait = 2
        if (this.retryNumber < 4) {
          this.retryNumber += 1
          console.log('retrying in', retryWait, 'seconds')
          setTimeout(this.initialize.bind(this), retryWait * 1000)
        }
      })
    }

  }
}




module.exports = {
  Device: ControlAdam,
}
