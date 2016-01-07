module.exports = {
    label: "temperature@lert MeasurementUnit",
    id: "temperaturAlertMeasurementUnit",
    autoDiscoveryDeviceTypes: [],
    devices: [{
        label: "Measurement Unit 1",
        id: "measurementUnit1",
        plugin: "temperatureAlert/measurementUnit",
        configuration: {host: "192.168.1.9", interval: 10000},
        actors: [],
        sensors: [],
        logLevel: "debug"
    }],
    groups: [],
    services: [],
    eventProcessors: [],
    data: []
};
