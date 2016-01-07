module.exports = {
    metadata: {
        family: "measurementUnit",
        plugin: "measurementUnit",
        label: "temperature@lert © Measurement Unit",
        tangible: true,
        discoverable: false,
        state: [{
            id: "temperature1",
            label: "Temperature 1",
            type: {
                id: "decimal"
            }
        }, {
            id: "temperature2",
            label: "Temperature 2",
            type: {
                id: "decimal"
            }
        }, {
            id: "temperature3",
            label: "Temperature 3",
            type: {
                id: "decimal"
            }
        }, {
            id: "temperature4",
            label: "Temperature 4",
            type: {
                id: "decimal"
            }
        }],
        configuration: [{
            id: "host",
            label: "Host",
            type: {id: "string"}
        }, {
            id: "interval",
            label: "Interval",
            type: {id: "number"}
        }],
        actorTypes: [],
        sensorTypes: [],
        services: []
    },
    create: function () {
        return new MeasurementUnit();
    }
};

var q = require('q');
var xml2js;
var request;

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

        this.state = {temperature1: 0, temperature2: 0, temperature3: 0, temperature4: 0};

        if (this.isSimulated()) {
            this.interval = setInterval(function () {
                this.state.temperature1 = new Date().getTime() % 4;
                this.state.temperature2 = new Date().getTime() % 3;
                this.state.temperature3 = new Date().getTime() % 2;
                this.state.temperature4 = new Date().getTime() % 5;

                this.publishStateChange();
            }.bind(this), this.configuration.interval);

            deferred.resolve();
        } else {
            if (!xml2js) {
                xml2js = require('xml2js');
            }

            if (!request) {
                request = require('request');
            }

            this.pollState();

            this.interval = setInterval(function () {
                this.pollState();
            }.bind(this), this.configuration.interval);

            deferred.resolve();
        }

        return deferred.promise;
    };

    /**
     *
     */
    MeasurementUnit.prototype.stop = function () {
        if (this.interval) {
            clearInterval(this.interval);
        }
    };

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

    /**
     *
     */
    MeasurementUnit.prototype.pollState = function () {
        this.logDebug("Poll state");

        request.get({
            url: this.url()
        }, function (error, response, body) {
            if (error) {
                this.logError(error);

                this.publishMessage(error);
            }
            else {
                xml2js.parseString(body, function (error, result) {
                    if (error) {
                        this.logError(error);
                    } else {
                        this.logDebug(result.currentConditions.ports[0].port);

                        for (var n in result.currentConditions.ports[0].port) {
                            var port = result.currentConditions.ports[0].port[n];
                            if (parseInt(port.$.number) > 4) {
                                this.logError("Unknown Port number " + port.$.number);

                                continue;
                            }

                            this.state["temperature" + port.$.number] = parseFloat(port.condition[0].currentReading[0]);

                            this.logDebug(">>>", this.state);

                            this.publishStateChange();
                        }
                    }
                }.bind(this));
            }
        }.bind(this));
    };
}
