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
/**
 * @author Kat Moormann
 * @version 3.0
 * TEC MANUAL: https://tetech.com/files/temperature_controller/TC-720_MANUAL.pdf
 * PAGE 88 - USB COMMUNICATION COMMANDS
 * Methods Included:
 *  - Get Temperature
 *  - Set Temperature
 *  - Get Output Power
 *  - Get Sensor 1
 *  - Get Sensor 2
 *  - Set Output
 */
const ui = require('./ui.js')
const db = require('./database.js')
const ad = require('./abstract-driver.js')
const bkup = require('./backup.js')

var tcID = 'TEC'
var tcPath = 'config/' + tcID
//_______________________________________________________________________________________________
class TC {
    constructor({id, Description = '', Details = 'Setpoint controls sensor 1: Cooling Fluid', router, testFlag = true, debugTest})
    {
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
        timeout: 300,
        debugTest: this.debugTest,
      }),
    })
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
//_______________________________________________________________________________________________
    /**
     * Output Enable method
     * Write Command: 30
     * Read Command: 64
     * Interpret: 0 == OFF
     *            1 == ON
     * Be sure that OUTPUT ENABLE has been set to ON; otherwise,
     * the program will run but the percent output power will remain
     * at 0%
     */

    Object.defineProperty(this, 'hiddenOutput', {
      writable: true,
      value: false,
    })

    Object.defineProperty(this, 'Output', {
      enumerable: true,
      get: () => {
        var getOutputStateCmd = '*6400002a\r'
        this.serialControl.serial(getOutputStateCmd).then(res => {
          // parse up response
          console.log('tc get output state')
          console.log(res)
          res = res[0]
          this.hiddenOutput = Buffer.compare(res, Buffer.from('2a3030303163315e', 'hex')) == 0 // 2a3030303163315e means that the output is on; otherwise, it's off

        }).catch(error => {
          console.log('Get TEC output state error')
          console.log(error)
        })
        return (new ui.ShowUser({value: this.hiddenOutput, type: ['output', 'binary']}))
      },
      set: (val) => {
        this.hiddenOutput = val

        if(val ===true)
        {
          console.log("ENABLE")
          var enable = '*30000124\r'
          this.serialControl.serial(enable).catch(error=>{
            console.log(" \n\n Enable ERROR \n\n ")
            console.log(error)
          })
        } else
        {
          console.log("DISABLE")
          var disable = '*30000023\r'
          this.serialControl.serial(disable).catch(error=>{
            console.log(" \n\n Disable ERROR \n\n ")
            console.log(error)
          })

        }
      }

    })
//_______________________________________________________________________________________________
    Object.defineProperty(this, 'hiddenTemperature', {
        writable: true,
        value: new ad.DataPoint({units: 'C'}),
      })

      Object.defineProperty(this, 'Temperature', {
        enumerable: true,
        /**
         *
         * @returns temperature of the TEC
         */
        get: () => {
          this.getTemperature().catch(error => {
            console.log('get TEC temperature error')
            console.log(error)
          })
          return (new ui.ShowUser({value: this.hiddenTemperature, type: ['output', 'datapoint']}))
        },

        /**
         * temperature is set between 0 and 50
         * ACTION ITEM: ADD TRY CATCH ERROR BLOCK IS USER PUTS IN ANYTHING BELOW 0 OR ABOVE 50
         * @param temperature
         *
         */
        set: temperature => {
          temperature = Number(temperature)
          if (temperature >= 0) {
            this.setTemperature(temperature).then(() => {
              this.hiddenStatus = 'Connected'
            }).catch(error => {
              console.log('\n\nSET temperature ERROR\n\n\n\n\n\n\n')
              console.log(error)
              this.hiddenStatus = error.toString()
            })
          } else {
            this.setNegTemperature(temperature).then(() => {
              this.hiddenStatus = 'Connected'
            }).catch(error => {
              console.log('\n\nSET temperature ERROR\n\n\n\n\n\n\n')
              console.log(error)
              this.hiddenStatus = error.toString()
            })
          }
        },
      })
//_______________________________________________________________________________________________
    Object.defineProperty(this, 'hiddenoutputPower', {
        writable: true,
        value: new ad.DataPoint({units: '%'}),
      })


    Object.defineProperty(this, 'outputPower', {
        enumerable: true,
        /**
         * @returns output power required to reach the set point temperature
         */
        get: () => {
            this.getoutputPower().then(() => {
                this.hiddenStatus='Connected'
            }).catch(error => {
                  console.log('Output Power error')
                  console.log(error)
                  this.hiddenStatus = error.toString()
            })
          return (new ui.ShowUser({value: this.hiddenoutputPower, type: ['input', 'datapoint']}))
        },
    })
//_______________________________________________________________________________________________
    Object.defineProperty(this,'hiddenSensor1',{
        writable: true,
        value: new ad.DataPoint({units: 'C'}),
    })
    Object.defineProperty(this,'Sensor1', {
        enumerable: true,
        /**
         * @returns the temperature at the TEC
         */
        get: () => {
            this.getSensor1().then(() => {
              this.hiddenStatus='Connected'
              }).catch(error => {
                    console.log('Sensor1 error')
                    console.log(error)
                    this.hiddenStatus = error.toString()
            })
            return (new ui.ShowUser({value: this.hiddenSensor1, type: ['input','datapoint']}))
        },
    })
//_______________________________________________________________________________________________
    Object.defineProperty(this,'hiddenSensor2',{
        writable: true,
        value: new ad.DataPoint({units: 'C'}),
    })
    Object.defineProperty(this,'Sensor2', {
        enumerable: true,
        /**
         * @returns the temperature of the TEC
         */
        get: () => {
            this.getSensor2().then(() => {
              this.hiddenStatus='Connected'
              }).catch(error => {
                    console.log('Sensor2 error')
                    console.log(error)
                    this.hiddenStatus = error.toString()
            })
            return (new ui.ShowUser({value: this.hiddenSensor2, type: ['input','datapoint']}))
        },
    })
//_______________________________________________________________________________________________
    console.log(testFlag)
    this.datastreams = {refreshRate: 1000}
    this.updateable = []
    this.initialize()
    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'TC_basic',
          fields: ['Sensor1','Sensor2','outputPower','Temperature'],
          obj: this,
          testFlag: this.testFlag,
          objPath: tcPath,
        })},
        path: tcPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
    }
//_______________________________________________________________________________________________
    /**
     * Read the actual temperature of the control thermistor
     * The control command, CC, for "INPUT1" sensor temperature is 01
     * There is no send value, so we calculate the checksum (SS) by adding the ascii values of the
     * characters 0,1,0,0,0,0
     */
     async getTemperature() {
      var input1='500000'

      function ascii_to_hex(str)
      {
          var arr1 = [];
          for (var n = 0, l = str.length; n < l; n ++)
          {
              var hex = Number(str.charCodeAt(n)).toString(16);
              arr1.push(hex);
          }
          return arr1 // results in an array of hexidecimal values
      }

      function hexToDec(hex)
      {
          var arr1=[];
          for(var n = 0, l = hex.length; n < l; n ++)
          {
              const Var = hex[n]
              var dec =Number(parseInt(Var,16));
              arr1.push(dec);
          }
          return arr1 // results in an array of decimal values
      }

      var input2=ascii_to_hex(input1)
      var sum = hexToDec(input2).reduce((partialSum,a)=>partialSum+a,0)
      var array = sum.toString(2).split("").map(Number)
      var removed = array.splice(0,1)

      const parseArray = array => {
        return array.reduce((acc, val) => {
           return (acc << 1) | val;
        });
     };

      var checksum = (parseArray(array).toString(16));

      var command = '*'+input1.concat(checksum)+'\r'
      //log("\n\n\nUSB COMMUNICATION to SENSOR 1: "+command+"\n\n\n")
      //console.log("SENSOR1 OUTPUT")
      var resp=await this.serialControl.serial(command, false, 200)
      //console.log('s1',resp[0].toString())
      var valHexAscii = resp[0].toString().slice(1,5)
      var val = Buffer.from(valHexAscii,'hex').readInt16BE()
      val = val/100
      //console.log(val)
      this.hiddenTemperature.value=Number(val)
      this.hiddenTemperature.time=Date.now()
      this.hiddenStatus='Connected'
      }
    
//_______________________________________________________________________________________________
    /**
     * Read the actual temperature of the control thermistor
     * The control command, CC, for "INPUT1" sensor temperature is 01
     * There is no send value, so we calculate the checksum (SS) by adding the ascii values of the
     * characters 0,1,0,0,0,0
     */
     async getSensor1() {
      var input1='010000'

      function ascii_to_hex(str)
      {
          var arr1 = [];
          for (var n = 0, l = str.length; n < l; n ++)
          {
              var hex = Number(str.charCodeAt(n)).toString(16);
              arr1.push(hex);
          }
          return arr1 // results in an array of hexidecimal values
      }

      function hexToDec(hex)
      {
          var arr1=[];
          for(var n = 0, l = hex.length; n < l; n ++)
          {
              const Var = hex[n]
              var dec =Number(parseInt(Var,16));
              arr1.push(dec);
          }
          return arr1 // results in an array of decimal values
      }

      var input2=ascii_to_hex(input1)
      var sum = hexToDec(input2).reduce((partialSum,a)=>partialSum+a,0)
      var array = sum.toString(2).split("").map(Number)
      var removed = array.splice(0,1)

      const parseArray = array => {
        return array.reduce((acc, val) => {
           return (acc << 1) | val;
        });
     };

      var checksum = (parseArray(array).toString(16));

      var command = '*'+input1.concat(checksum)+'\r'
      //log("\n\n\nUSB COMMUNICATION to SENSOR 1: "+command+"\n\n\n")
      //console.log("SENSOR1 OUTPUT")
      var resp=await this.serialControl.serial(command, false, 200)
      //console.log('s1',resp[0].toString())
      var valHexAscii = resp[0].toString().slice(1,5)
      var val = Buffer.from(valHexAscii,'hex').readInt16BE()
      val = val/100
      //console.log(val)
      this.hiddenSensor1.value=Number(val)
      this.hiddenSensor1.time=Date.now()
      this.hiddenStatus='Connected'
      }
// //_______________________________________________________________________________________________
//     /**
//      * Read the actual temperature of the control thermistor
//      * The control command, CC, for "INPUT2" sensor temperature is 04
//      * There is no send value, so we calculate the checksum (SS) by adding the ascii values of the
//      * characters 0,4,0,0,0,0
//      */
     async getSensor2() {
        var input1='040000'

        function ascii_to_hex(str)
        {
            var arr1 = [];
            for (var n = 0, l = str.length; n < l; n ++)
            {
                var hex = Number(str.charCodeAt(n)).toString(16);
                arr1.push(hex);
            }
            return arr1 // results in an array of hexidecimal values
        }

        function hexToDec(hex)
        {
            var arr1=[];
            for(var n = 0, l = hex.length; n < l; n ++)
            {
                const Var = hex[n]
                var dec =Number(parseInt(Var,16));
                arr1.push(dec);
            }
            return arr1 // results in an array of decimal values
        }

        var input2=ascii_to_hex(input1)
        var sum = hexToDec(input2).reduce((partialSum,a)=>partialSum+a,0)
        var array = sum.toString(2).split("").map(Number)
        var removed = array.splice(0,1)

        const parseArray = array => {
          return array.reduce((acc, val) => {
             return (acc << 1) | val;
          });
       };

        var checksum = (parseArray(array).toString(16));

        var command = '*'+input1.concat(checksum)+'\r'
        //console.log("\n\n\nUSB COMMUNICATION to SENSOR 2: "+command+"\n\n\n")
        //console.log("SENSOR2 OUTPUT")
        var resp=await this.serialControl.serial(command, false, 200)
        //console.log('s2',resp[0].toString())
        var valHexAscii = resp[0].toString().slice(1,5)
        var val = Buffer.from(valHexAscii,'hex').readInt16BE()
        val = val/100
        //console.log(val)
        this.hiddenSensor2.value=Number(val)
        this.hiddenSensor2.time=Date.now()
        this.hiddenStatus='Connected'
        }
//_______________________________________________________________________________________________
  /**
   * Power Output
   * Write Command: NA
   * Read Command: 02
   * Interpret: Convert the returned hexadecimal value to decimal. 511 base 10 represents 100% output(heating)/
   * -511 base 10 represents -100% output(cooling)
   */
      async getoutputPower() {
        this.hiddenoutputPower.time = Date.now()
        var input1='020000'
        //console.log("INPUT1: "+input1)
        function ascii_to_hex(str)
        {
            var arr1 = [];
            for (var n = 0, l = str.length; n < l; n ++)
            {
                var hex = Number(str.charCodeAt(n)).toString(16);
                arr1.push(hex);
            }
            return arr1 // results in an array of hexidecimal values
        }

        function hexToDec(hex)
        {
            var arr1=[];
            for(var n = 0, l = hex.length; n < l; n ++)
            {
                const Var = hex[n]
                var dec =Number(parseInt(Var,16));
                arr1.push(dec);
            }
            return arr1 // results in an array of decimal values
        }

        var input2=ascii_to_hex(input1)
        var sum = hexToDec(input2).reduce((partialSum,a)=>partialSum+a,0)
        var array = sum.toString(2).split("").map(Number)
        var removed = array.splice(0,1)

        const parseArray = array => {
          return array.reduce((acc, val) => {
            return (acc << 1) | val;
          });
      };

      var checksum = (parseArray(array).toString(16));

      var command = '*'+input1.concat(checksum)+'\r'
      //console.log("\n\n\nUSB COMMUNICATION to Power Output: "+command+"\n\n\n")
      //console.log("POWER OUTPUT")
      var resp=await this.serialControl.serial(command, false, 200)
      //console.log('poweroutput',resp[0].toString())
      var valHexAscii = resp[0].toString().slice(1,5)
      var val = Buffer.from(valHexAscii,'hex').readInt16BE()
      val = 100+(val-511)*((-100-100)/(-511-511))
      //console.log(val)
      this.hiddenoutputPower.value=Number(val)
      this.hiddenoutputPower.time=Date.now()
      this.hiddenStatus='Connected'
      }

//_______________________________________________________________________________________________
      async setNegTemperature(temperature){
        temperature=((2**16)-(temperature*-100)).toString(16).padStart(4,'0')
        var controllerCommand = '1c'
        var input1 = controllerCommand.concat(temperature)


        function ascii_to_hex(str)
        {
            var arr1 = [];
            for (var n = 0, l = str.length; n < l; n ++)
            {
                var hex = Number(str.charCodeAt(n)).toString(16);
                arr1.push(hex);
            }
            return arr1 // results in an array of hexidecimal values
        }

        function hexToDec(hex)
        {
            var arr1=[];
            for(var n = 0, l = hex.length; n < l; n ++)
            {
                const Var = hex[n]
                var dec =Number(parseInt(Var,16));
                arr1.push(dec);
            }
            return arr1 // results in an array of decimal values
        }

        var input2 = ascii_to_hex(input1)
        var sum = hexToDec(input2).reduce((partialSum,a)=>partialSum+a,0)
        var array = sum.toString(2).split("").map(Number)
        var removed = array.splice(0,1)

        const parseArray = array => {
            return array.reduce((acc, val) => {
               return (acc << 1) | val;
            });
         };

        var checksum = (parseArray(array).toString(16));
        var usbCommand = '*'+input1.concat(checksum)+'\r'
        var command = usbCommand

        //console.log("\n\n\nUSB COMMUNICATION FOR NEGATIVE TEMPERATURE: "+command+"\n\n\n")
        this.serialControl.serial(command, false, 50).then(() => {
        this.hiddenStatus = 'Connected'
        }).catch(error => {
                // this command doesn't give a response, so just set a short timeout and catch the error
        })
        }
//_______________________________________________________________________________________________
    /**
     * To write a command to a controller, the controlling computer must send the following
     * ASCII characters: (stx)(CCDDDDSS)(etx)
     * Control command, CC, for "FIXED DESIRED CONTROL SETTING" IS 1c
     * Multiply the desired set-point temperature by 100
     * Convert decimal to hexadecimal and add on leading zeros to make the four
     * character send value DDDD
     */

    /**
     * @param temperature       tempearture input by user through API
     * @var controllerCommand   fixed desired control setting provided on page 89 of TC720 manual
     * @var input1              CC + DDDD in ascii format
     * @var input2              CCDDDD in hexadecimal format, returns an array of hexadecimal values
     * @var sum                 summation of hexadecimal values converted to one decimal value
     * @var array               decimal value converted to an array of bit values
     * @var removed             removal of the 8 least significant binary bits of the sum
     * @var checksum            8 bit checksum value converted back to its hexadecimal format
     * @var usbCommand          *+CCDDDD+SS+\r
     *
     * @function ascii_to_hex   Convert ascii string to hexadecimal array
     * @function hexToDec       Convert hexadecimal array to decimal array
     *
     * @const parseArray        Add up the binary array and convert value to hexadecimal (checksum value)
     */

    async setTemperature(temperatureInput) {
        var temperature = (temperatureInput*100).toString(16).padStart(4,'0') // Convert number to a hexadecimal string
        var controllerCommand = '1c'
        var input1 = controllerCommand.concat(temperature)

        function ascii_to_hex(str)
        {
            var arr1 = [];
            for (var n = 0, l = str.length; n < l; n ++)
            {
                var hex = Number(str.charCodeAt(n)).toString(16);
                arr1.push(hex);
            }
            return arr1 // results in an array of hexidecimal values
        }

        function hexToDec(hex)
        {
            var arr1=[];
            for(var n = 0, l = hex.length; n < l; n ++)
            {
                const Var = hex[n]
                var dec =Number(parseInt(Var,16));
                arr1.push(dec);
            }
            return arr1 // results in an array of decimal values
        }

        var input2 = ascii_to_hex(input1)
        var sum = hexToDec(input2).reduce((partialSum,a)=>partialSum+a,0)
        var array = sum.toString(2).split("").map(Number)
        var removed = array.splice(0,1)

        const parseArray = array => {
            return array.reduce((acc, val) => {
               return (acc << 1) | val;
            });
         };

        var checksum = (parseArray(array).toString(16));
        var usbCommand = '*'+input1.concat(checksum)+'\r'
        var command = usbCommand
        //console.log("\n\n\nUSB COMMUNICATION: "+command+"\n\n\n")
        var res = await this.serialControl.serial(command, false, 100)
        this.hiddenTemperature.time = Date.now()
        this.hiddenTemperature.value = temperatureInput
        this.hiddenStatus = 'Connected'
        console.log(res)

      }

    initialize() {
        // initialize
    }
}
//_______________________________________________________________________________________________
    var tcMap = {}
    var tcList = ['A']
    var ports = ['/dev/ttyUSB2']
    var serialLineSerials = ['AQ00VDL8']

    module.exports = {
        initialize: async function (test) {
          test = false // set false - runs system in development mode
          //console.log('intializing TC')
          var i = 0
          for (i = 0; i < tcList.length; i++) {
            var tc = tcList[i]
            var router = new ad.Router({portPath: ports[i], baud: 230400, testFlag: test, timing: true, manufacturer: 'FTDI', seriallineSerial: serialLineSerials[i]})
            if (!test) {
              try {
                await router.openPort()
              } catch (error) {
                console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
                throw error
              }
            }
            tcMap[tc] = new TC({id: tc, testFlag: test, router: router, debugTest: false})
        }

        return
      },
      id: tcID,
      obj: tcMap
    }
