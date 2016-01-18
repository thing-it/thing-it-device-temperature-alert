module.exports = {
    metadata: {
        plugin: "TemperatureSensor",
        label: "Temperature Sensor",
        role: "actor",
        family: "measurementUnit",
        deviceTypes: ["temperature-alert/measurementUnit"],
        services: [],
        state: [{
            id: "currentReading", label: "Current Reading",
            type: {
                id: "decimal"
            }
        }, {
            id: "highLimit", label: "High Limit",
            type: {
                id: "integer"
            }
        }, {
            id: "lowLimit", label: "Low Limit",
            type: {
                id: "integer"
            }
        }, {
            id: "alarmStatus", label: "Alarm Status",
            type: {
                id: "boolean"
            }
        }, {
            id: "prevAlarmStatus", label: "Prev Alarm Status",
            type: {
                id: "boolean"
            }
        }],
        configuration: [{
            label: "ID",
            id: "id",
            type: {
                id: "integer"
            },
            defaultValue: "1"
        }, {
            label: "Port Number",
            id: "portNumber",
            type: {
                id: "integer"
            },
            defaultValue: "1"
        }, {
            id: "name",
            label: "Name",
            type: {id: "string"}
        }, {
            id: "type",
            label: "Type",
            type: {id: "string"}
        }, {
            id: "userDefined01",
            label: "User Defined 01",
            type: {id: "string"}
        }, {
            id: "userDefined02",
            label: "User Defined 02",
            type: {id: "string"}
        }]
    },
    create: function () {
        return new TemperatureSensor();
    }
};

var q = require('q');
var hue;

/**
 *
 */
function TemperatureSensor() {
    /**
     *
     */
    TemperatureSensor.prototype.start = function () {
        var deferred = q.defer();

        this.started = true;
        this.state = {
            temperature: 0,
        };

        if (!this.isSimulated()) {
            if (!hue) {
                hue = require('node-hue-api');
            }

            this.interval = setInterval(function () {
                this.device.hueApi.lightStatus(this.configuration.id)
                    .then(function (lightState) {
                        this.state.reachable = lightState.reachable;
                    }.bind(this)).fail(function (error) {
                    this.state.reachable = false;
                }.bind(this));
            }.bind(this), 10000);
        }
        else {
        }

        deferred.resolve();

        return deferred.promise;
    };

    /**
     *
     */
    TemperatureSensor.prototype.stop = function () {
        var deferred = q.defer();

        this.started = false;
        this.logInfo("Stopping Temperature Sensor " + this.state.name + " at port " + this.configuration.portNumber
            + " of device " + this.devive.configuration.host + ".");

        for (var interval in this.intervals) {
            clearInterval(interval);
        }

        for (var interval in this.simulationIntervals) {
            clearInterval(interval);
        }

        this.state.temperature = 0;
        deferred.resolve();
        return deferred.promise;
    };

    /**
     *
     */
    TemperatureSensor.prototype.getState = function () {
        return this.state;
    };

    /**
     *
     */
    TemperatureSensor.prototype.setState = function (state) {
        this.state = state;
        this.publishStateChange();
    };

    /**
     *
     */
    TemperatureSensor.prototype.updateReading = function (port) {
        this.state.currentReading = port.currentReading;
        this.state.highLimit = port.highLimit;
        this.state.lowLimit = port.lowLimit;
        this.state.alarmStatus = port.alarmStatus;
        this.state.prevAlarmStatus = port.prevAlarmStatus;
        this.logDebug("Updated sensor " + this.configuration.name + " on port " + this.configuration.portNumber +
            " with reading '" + this.state.currentReading + "'.");
        this.publishStateChange();
    };

};
