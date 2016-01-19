module.exports = {
    metadata: {
        family: "measurementUnit",
        plugin: "measurementUnit",
        label: "temperature@lert © Measurement Unit",
        manufacturer: "Temperature@lert",
        tangible: false,
        discoverable: true,
        state: [{
            id: "readingDateTime",
            label: "Reading Date Time",
            type: {id: "string"}
        }, {
            id: "tempUnits",
            label: "Temp Units",
            type: {id: "string"}
        }, {
            id: "form",
            label: "Form",
            type: {id: "string"}
        }],
        configuration: [{
            id: "host",
            label: "Host",
            type: {id: "string"}
        }, {
            id: "deviceName",
            label: "Device Name",
            type: {id: "string"}
        }, {
            id: "interval",
            label: "Interval",
            type: {id: "integer"}
        }, {
            id: "userDefined01",
            label: "User Defined 01",
            type: {id: "string"}
        }, {
            id: "userDefined02",
            label: "User Defined 02",
            type: {id: "string"}
        }],
        actorTypes: [],
        sensorTypes: [],
        services: []
    },
    create: function () {
        return new MeasurementUnit();
    },
    discovery: function (options) {
        var discovery = new MeasurementUnitDiscovery();

        discovery.options = options;

        return discovery;
    }
};

var q = require('q');
var xml2js;
var request;
var https;
var sensorLibrary;

function pollUnitState(host, mac, callback) {
    this.logDebug("Polling unit state for unit located at " + host);
    var url = "http://" + host + "/xmlfeed.rb";

    if (!request) {
        request = require('request');
    }

    request.get({
        url: url
    }, function (error, response, body) {
        if (error) {
            this.logError("Error communicating to measurement unit.", error, body);
            callback(error, null);
        }
        else {
            if (!xml2js) {
                xml2js = require('xml2js');
            }

            xml2js.parseString(body, function (error, result) {
                if (error) {
                    this.logError("Parser error processing response from measurement unit.", error, result);
                    callback(error, null);
                } else {
                    readUnitState.call(this, host, mac, result, callback);
                }
            }.bind(this));
        }
    }.bind(this));
}

function readUnitState(host, mac, result, callback) {
    try {
        var unitState = {
            host: host,
            mac: mac,
            deviceName: result.currentConditions.deviceName[0],
            readingDateTime: result.currentConditions.readingDateTime[0],
            tempUnits: result.currentConditions.tempUnits[0],
            form: result.currentConditions.form[0],
            ports: []
        };

        for (var n in result.currentConditions.ports[0].port) {
            try {
                var port = result.currentConditions.ports[0].port[n];

                unitState.ports[parseInt(port.$.number)] = {
                    number: parseInt(port.$.number),
                    name: port.$.name,
                    type: port.condition[0].$.type,
                    currentReading: parseFloat(port.condition[0].currentReading[0]),
                    highLimit: parseInt(port.condition[0].highLimit[0]),
                    lowLimit: parseInt(port.condition[0].lowLimit[0]),
                    alarmStatus: Boolean(port.condition[0].alarmStatus[0] != "0"),
                    prevAlarmStatus: Boolean(port.condition[0].prevAlarmStatus[0] != "0"),
                };

            } catch (e) {
                this.logError("Error reading port data for port " + n + ". Continuing reading " +
                    "remaining ports.", e, unitState, result);
            }

        }

        this.logDebug("unitState", unitState);
        callback(null, unitState);
    } catch (e) {
        this.logError("Error reading data in response from measurement unit.", e, unitState, result);
        callback(e, unitState);
    }
}


function MeasurementUnitDiscovery() {
    var discoveryInterval;
    var vendors;

    MeasurementUnitDiscovery.prototype.start = function () {
        vendors = {};

        if (!this.node.isSimulated()) {
            this.logLevel = "info";
            this.scanForUnits();
            discoveryInterval = setInterval(function () {
                this.scanForUnits();
            }.bind(this), 60000);
        }
    }

    MeasurementUnitDiscovery.prototype.stop = function () {
        if (discoveryInterval !== undefined && discoveryInterval) {
            clearInterval(discoveryInterval);
        }
    }

    MeasurementUnitDiscovery.prototype.scanForUnits = function () {
        this.scanLocalAreaNetworkHosts(function (error, ip, mac) {
            if (error) {
                this.logError(error);
            } else if (ip && !mac) {
                this.logDebug("Ignoring host with unknown MAC address.");
            } else {
                this.getVendorForMac(mac, function (err, vendor) {
                    if (err) {
                        this.logError(ip, err);
                    } else if (vendor) {
                        if ((-1 < vendor.indexOf("ALFA, INC.")) ||
                            (-1 < vendor.indexOf("Wilibox Deliberant Group LLC"))) {
                            this.logDebug("Vendor match found for host "
                                + ip + ": \"" + vendor + "\"");
                            this.testConnection(ip, mac);
                        }
                        else {
                            this.logDebug("Ignoring host " + ip + " with vendor " + vendor + ".");
                        }
                    } else {
                        this.logDebug("No vendor found for IP " + ip + "; ignoring host.");
                    }
                }.bind(this));
            }
        }.bind(this));
    }

    /**
     * Searches the ARP entries for MAC addresses in the same subnet as the computer the code is running on.
     *
     * @param callback Invokes the callback for each identified MAC address. First parameter is an error,
     *                  second the ip address, third the host.
     */
    MeasurementUnitDiscovery.prototype.scanLocalAreaNetworkHosts = function (callback) {
        var arp = require('node-arp');
        var network = require('network');

        network.get_active_interface(function (err, obj) {
            if (err) {
                this.logError(err);
                callback(err, false, false);
            } else {
                var myIp = obj.ip_address;
                this.logDebug("My IP address determined as " + myIp);
                var subnet = myIp.substring(0, myIp.lastIndexOf(".") + 1);
                this.logDebug("Scanning for hosts in IP range " + subnet + "1 to " + subnet + "254.");

                for (var i = 1; i < 255; i++) {
                    (function () {
                        var currentIP = subnet + i;

                        if (currentIP != myIp) {
                            arp.getMAC(currentIP, function (err, mac) {
                                if (err) {
                                    this.logError(currentIP, err);
                                } else {
                                    if (mac !== undefined && mac && ("(incomplete)" != mac) && ("eth0" != mac)) {
                                        this.logDebug ("MAC address found for IP " + currentIP + ": " + mac);
                                        callback(false, currentIP, mac);
                                    }
                                }
                            }.bind(this));
                        }
                    }.bind(this))();
                }
            }
        }.bind(this))
    }

    /**
     * Retrieves the vendor name for a MAC address.
     * @param mac       The MAC address to look up.
     * @param callback  Invoked with return values with first parameter an error, second the vendor name.
     */
    MeasurementUnitDiscovery.prototype.getVendorForMac = function (mac, callback) {
        this.logDebug("Looking up vendor for MAC address " + mac + ".");
        var cashedVendor = vendors[mac];

        if (cashedVendor || ("" == cashedVendor)) {
            this.logDebug("Retrieved vendor '" + cashedVendor + "' from vendor cache.");

            if ("" !== cashedVendor) {
                callback(false, cashedVendor);
            } else {
                callback(false, false);
            }
        } else {
            var data = "";

            var options = {
                hostname: 'www.macvendorlookup.com',
                port: 443,
                path: '/api/v2/' + mac,
                method: 'GET',
                rejectUnauthorized: false
            };

            if (!https) {
                https = require('https');
            }

            var req = https.request(options, function (res) {
                res.on('data', function (chunk) {
                    data += chunk;
                }.bind(this));

                res.on('end', function () {
                    var vendor;

                    if ("" !== data) {
                        var vendorLookup = JSON.parse(data);

                        if ((vendorLookup !== undefined && vendorLookup) &&
                            (vendorLookup[0] !== undefined && vendorLookup[0]) &&
                            (vendorLookup[0].company !== undefined && vendorLookup[0].company)) {
                            vendor = vendorLookup[0].company;
                            this.logDebug("Vendor for MAC address " + mac + " identified as " + vendor + ".");
                            vendors[mac] = vendor;
                            callback(false, vendor);
                        }
                    } else {
                        this.logDebug("Vendor for MAC address " + mac + " not identified.");
                        vendors[mac] = "";
                        callback(false, false);
                    }
                }.bind(this));
            }.bind(this));

            req.end();

            req.on('error', function (e) {
                this.logError("MAC based vendor lookup failed for MAC address " + mac + ".", e);
                callback(e, false);
            }.bind(this));
        }
    }

    MeasurementUnitDiscovery.prototype.testConnection = function (ip, mac) {
        pollUnitState.call(this, ip, mac, function (error, unitStatus) {
            if (error) {
                this.logError("Skipping host " + host + " in Temperature@lert auto discovery due to an error.", error);
            } else {
                try {
                    var discoveredDevice = new MeasurementUnit();
                    discoveredDevice.configuration = this.defaultConfiguration;
                    discoveredDevice.configuration.host = unitStatus.host;
                    discoveredDevice.configuration.deviceName = unitStatus.deviceName;
                    discoveredDevice.configuration.interval = 10000;
                    discoveredDevice.uuid = unitStatus.mac;

                    discoveredDevice.actors = [];
                    var currentPort;

                    for (var n in unitStatus.ports) {
                        currentPort = unitStatus.ports[n];

                        if (currentPort.type === "temperature") {
                            if (!sensorLibrary) {
                                sensorLibrary = require("./default-units/temperatureSensor")
                            }

                            var temperatureSensor = new sensorLibrary.create();
                            temperatureSensor.id = currentPort.number;
                            temperatureSensor.label = currentPort.name;
                            temperatureSensor.type = "TemperatureSensor";
                            temperatureSensor.configuration = {
                                id: currentPort.number,
                                portNumber: currentPort.number,
                                name: currentPort.name,
                                type: currentPort.type,
                            };
                            temperatureSensor.state = {};

                            discoveredDevice.actors.push(temperatureSensor);
                        }
                    }

                    this.logDebug("Discovered Temperature@lert unit with name " +
                        discoveredDevice.configuration.deviceName + " at IP address " +
                        discoveredDevice.configuration.host + " with " + discoveredDevice.actors.length + " ports.");
                    this.advertiseDevice(discoveredDevice);
                } catch (e) {
                    this.logError("Error creating Temperature@lert device.", e, unitStatus, discoveredDevice, e.stack);
                }
            }
        }.bind(this));
    }
}
/**
 *
 */
function MeasurementUnit() {
    /**
     *
     */
    MeasurementUnit.prototype.start = function () {
        var deferred = q.defer();

        this.logDebug("Unit started");

        if ((this.configuration.interval > 1000) && (this.configuration.interval < 60000)) {
            this.logDebug("Applying interval of " + this.configuration.interval + " as configured.");
        } else {
            this.logDebug("Configured interval of " + this.configuration.interval + " out of range; changing " +
                "to 10000 (10s).");
            this.configuration.interval = 10000;
        }

        this.intervals = [];
        this.simulationIntervals = [];
        this.state = {temperature1: 0, temperature2: 0, temperature3: 0, temperature4: 0};

        if (this.isSimulated()) {
            this.simulationIntervals.push(setInterval(function () {
                this.state.temperature1 = new Date().getTime() % 4;
                this.state.temperature2 = new Date().getTime() % 3;
                this.state.temperature3 = new Date().getTime() % 2;
                this.state.temperature4 = new Date().getTime() % 5;

                this.publishStateChange();
            }.bind(this), this.configuration.interval));

            deferred.resolve();
        } else {
            if (!xml2js) {
                xml2js = require('xml2js');
            }

            if (!request) {
                request = require('request');
            }

            pollUnitState.call(this, this.configuration.host, this.configuration.mac, function (error, unitState) {
                this.updateSensors(unitState);
            }.bind(this));

            this.intervals.push(setInterval(function () {
                pollUnitState.call(this, this.configuration.host, this.configuration.mac, function (error, unitState) {
                    this.updateSensors(unitState);
                }.bind(this))
            }.bind(this), this.configuration.interval));

            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     *
     */
    MeasurementUnit.prototype.stop = function () {
        for (var interval in this.intervals) {
            clearInterval(interval);
        }

        for (var interval in this.simulationIntervals) {
            clearInterval(interval);
        }
    };

    /**
     *
     * @param unitState
     */
    MeasurementUnit.prototype.updateSensors = function (unitState) {
        try {
            var currentPort;

            for (var n in this.actors) {
                currentPort = unitState.ports[this.actors[n].configuration.portNumber];

                if (currentPort) {
                    this.actors[n].updateReading(currentPort);
                }
            }
        } catch (e) {
            this.logError("Error reading temperature.", e);
        }
    }

    /**
     *
     */
    MeasurementUnit.prototype.url = function (path) {
        return "http://" + this.configuration.host + "/xmlfeed.rb";
    };

    /**
     *
     */
    MeasurementUnit.prototype.setState = function (state) {
        this.state = state;
    };

    /**
     *
     */
    MeasurementUnit.prototype.getState = function () {
        return this.state;
    };
}
