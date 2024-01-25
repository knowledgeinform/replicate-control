const ui = require('./ui.js')
const bkup = require('./backup.js')
const ad = require('./abstract-driver.js')
const adamRelay = require('./relay-adam.js')

var valvesID = 'Valves'
var valvesPath = 'config/' + valvesID


class ValveC {
    constructor({ router, Description, Details, testFlag = true, address, services, serverInstance }) {
        // console.log(`\n\n\nADDRESS: ${JSON.stringify(address)}\n\n\n`)
        this.address = new ui.ShowUser({ value: address})
        this.Description = new ui.ShowUser({value: Description})
        this.Details = new ui.ShowUser({value: Details})
        
        Object.defineProperty(this, 'testFlag', {
            writable: true,
            value: testFlag,
        })

        Object.defineProperty(this, 'hidden', {
            value: new adamRelay.Device({
                address: this.address.value,
                router: router,
                testFlag: testFlag,
                services: services,
                server: serverInstance,
                configPath: valvesPath,
            })
        })

        this.datastreams = { refreshRate: 4000 }
        this.updateable = []


        if (this.hidden.numberVSs) {
            var descriptor = []
            var name = []
            for (var i = 0; i < this.hidden.numberVSs; i++) {
                name.push('VS' + i.toString())
                descriptor.push('Valve ' + i.toString())
            }
            descriptor.forEach((d, i) => {
                Object.defineProperty(this, d, {
                    enumerable: true,
                    get: () => {
                        // console.log('Getting PV '+i)
                        // console.log(`Getting ${name[i]}: ${this.hidden[name[i]].value}`)
                        return (new ui.ShowUser({ value: this.hidden[name[i]].value, type: ['output', 'binary'] }))
                    },
                    set: val => {
                        // console.log(`Setting ${name[i]}: ${val}`)
                        this.hidden[name[i]] = val
                    }
                })
            })
        }
    }
}


var valveMap = {
    '01': { Description: '', Details: '', address: '01' }
}

var ports = ['COM15']
var serialLineSerials = ['FTVAHE4V']
var manufacturer = ['FTDI']
var routers = {}

module.exports = {
    initialize: async function (test, reinit, services, serverInstance) {
        console.log('Initializating Valves in valves.js')
        // test = false
        if (test === undefined) {
            test = false
        }

        for (var i = 0; i < Object.keys(valveMap).length; i++) {
            routers[Object.keys(valveMap)[i]] = new ad.Router({
                portPath: ports[i],
                baud: 9600,
                testFlag: test,
                manufacturer: manufacturer[i],
                seriallineSerial: serialLineSerials[i]
            })

            if (!test) {
                try {
                    await routers[Object.keys(valveMap)[i]].openPort()
                } catch (error) {
                    console.log('BIG OPEN PORT ERROR--Should NEVER reach here')
                    throw error
                }
            }
        }


        if (bkup.configExists(valvesPath)) {
            // this should eventually be in a try-catch with a default config
            var loadMap = bkup.load(valvesPath)
            Object.entries(loadMap).forEach(([key, value], i) => {
                // specify bare-minimum amount that the config should have
                // console.log(value)

                console.log(key)
                valveMap[key] = new ValveC({
                    router: routers[key],
                    Description: value.Description.value,
                    Details: value.Details.value,
                    testFlag: test,
                    address: value.address.value,
                    services: services,
                    serverInstance: serverInstance
                })
                
                setTimeout(() => {
                    console.log('Initializing Valve Control')
                    valveMap[key].hidden.initialize()
                }, 500)
                bkup.save(valveMap[key], valvesPath)
            })
        } else {
            // add details to valve map
            Object.entries(valveMap).forEach(([key, value], i) => {
                valveMap[key] = new ValveC({
                    router: routers[key],
                    Description: value.Description,
                    Details: value.Details,
                    testFlag: test,
                    address: value.address,
                    services: services,
                    serverInstance: serverInstance
                })

                // console.log(valvesMap[key])
                setTimeout(() => {
                    console.log('Initializing Valve Control')
                    valveMap[key].hidden.initialize()
                }, 500)
                bkup.save(valveMap[key], valvesPath)
                
            })

            

        }


        return
    },
    id: valvesID,
    obj: valveMap,
    path: valvesPath,
}
