/**
 * This test file allows to run the basic initiation of the
 *
 * MeasurementUnitDiscovery class. It does not, however, simulate full
 * interaction with the node.
 */

var TAUNIT = require('../measurementUnit');

var tempalertDiscovery = TAUNIT.discovery({});
console.log(tempalertDiscovery);

tempalertDiscovery.isSimulated = function () {
    return false;
};

tempalertDiscovery.defaultConfiguration = [];

tempalertDiscovery.node = {
    options: {dataDirectory: "/Users/Klaus/tin/data"}, isSimulated: function () {
        return false
    }
};

tempalertDiscovery.logInfo = function () {
    if (arguments.length == 1) {
        console.log(arguments[0]);
    }
    else {
        console.log(arguments);
    }
};

tempalertDiscovery.logDebug = function () {
    tempalertDiscovery.logInfo(arguments);
};

tempalertDiscovery.logError = function () {
    tempalertDiscovery.logInfo(arguments);
};

tempalertDiscovery.advertiseDevice = function (device) {
    this.logInfo("Advertising device", device);

    device.isSimulated = function () {
        return false;
    };

    device.node = {
        options: {dataDirectory: "/Users/Klaus/tin/data"}, isSimulated: function () {
            return false
        }
    }

    device.isSimulated = function () {
        return device.configuration.simulated;
    }

    device.publishEvent = function (event, data) {
        console.log("Event", event);
    };

    device.publishStateChange = function () {
        //console.log("State Change", this.getState());
        console.log("State Change");
    };

    device.logInfo = function () {
        if (arguments.length == 1) {
            console.log(arguments[0]);
        }
        else {
            console.log(arguments);
        }
    };

    device.logDebug = function () {
        device.logInfo(arguments);
    };

    device.logError = function () {
        device.logInfo(arguments);
    };

    console.log("About to start device.");
    device.start();
}

console.log("About to start.");
tempalertDiscovery.start();


