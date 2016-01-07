var assert = require("assert");

describe('[thing-it] temperature@lert test', function () {
    var testDriver;

    before(function () {
        testDriver = require("thing-it-test").createTestDriver({logLevel: "error", simulated: false});

        testDriver.registerDevicePlugin(__dirname + "/../measurementUnit");
    });
    describe('Start Configuration', function () {
        this.timeout(5000);

        it('should complete without error', function () {
            return testDriver.start({
                configuration: require("../examples/configuration.js"),
                heartbeat: 10
            });
        });
    });
    describe('Switch Discovery', function () {
        this.timeout(20000);

        before(function () {
            testDriver.removeAllListeners();
        });
        it('should produce Device Discovery message', function (done) {
            testDriver.addListener({
                publishDeviceRegistration: function (device) {
                    done();
                }
            });
        });
    });
});





