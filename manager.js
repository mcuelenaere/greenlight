'use strict';

const
    Bluelight = require('bluelight'),
    events = require('events'),
    util = require('util');

function validateColor(color) {
    if (typeof color !== 'object') {
        throw 'Color is not an object';
    }
    for (let key of ['red', 'green', 'blue', 'opacity']) {
        if (!(key in color)) {
            throw 'Color is missing property "' + key + '"';
        }

        if (typeof color[key] !== 'number') {
            throw 'Color.' + key + ' is not a number';
        }

        if (color[key] < 0.0 || color[key] > 1.0) {
            throw 'Color.' + key + ' is not between 0.0 and 1.0';
        }
    }
}

class Manager {
    constructor() {
        this._bluelight = new Bluelight();
        this._devices = {};

        // bind event handlers
        this._bluelight.on('error', (err) => {
            this.emit('error', err);
        });
        this._bluelight.on('discover', (device) => {
            this.emit('deviceDiscovered', this._getDeviceData(device));
        });
        this._bluelight.on('disconnect', (device) => {
            this.emit('deviceLost', {
                'deviceId': device.uniqueId
            });
        });
        this._bluelight.on('scanStop', () => {
            this.emit('scanStopped');
        });
    }

    _getDeviceProperty(deviceId, propertyName) {
        if (!(deviceId in this._devices)) {
            this._devices[deviceId] = {};
        }
        return this._devices[deviceId][propertyName];
    }

    _setDeviceProperty(deviceId, propertyName, propertyValue) {
        if (!(deviceId in this._devices)) {
            this._devices[deviceId] = {};
        }
        this._devices[deviceId][propertyName] = propertyValue;
    }

    startScanning() {
        this._bluelight.scanFor(5000);
        this.emit('scanStarted');
    }

    enableLight(deviceId) {
        for (let device of this._bluelight.detectedDevices) {
            if (device.uniqueId === deviceId) {
                device.enableLight();
                this._setDeviceProperty(deviceId, 'enabled', true);
                this.emit('lightEnabled', {
                    'deviceId': device.uniqueId
                });
                return true;
            }
        }

        return false;
    }

    disableLight(deviceId) {
        for (let device of this._bluelight.detectedDevices) {
            if (device.uniqueId === deviceId) {
                device.disableLight();
                this._setDeviceProperty(deviceId, 'enabled', false);
                this.emit('lightDisabled', {
                    'deviceId': device.uniqueId
                });
                return true;
            }
        }

        return false;
    }

    setColor(deviceId, color) {
        validateColor(color);

        for (let device of this._bluelight.detectedDevices) {
            if (device.uniqueId === deviceId) {
                device.setColor(color.red, color.green, color.blue, color.opacity);
                this._setDeviceProperty(deviceId, 'color', color);
                this.emit('colorSet', {
                    'deviceId': device.uniqueId,
                    'color': color
                });
                return true;
            }
        }

        return false;
    }

    renameDevice(deviceId, newName) {
        for (let device of this._bluelight.detectedDevices) {
            if (device.uniqueId === deviceId) {
                this._setDeviceProperty(deviceId, 'name', newName);
                this.emit('deviceRenamed', {
                    'deviceId': device.uniqueId,
                    'name': newName
                });
                return true;
            }
        }

        return false;
    }

    _getDeviceData(device) {
        let name = this._getDeviceProperty(device.uniqueId, 'name');
        let enabled = this._getDeviceProperty(device.uniqueId, 'enabled');
        let color = this._getDeviceProperty(device.uniqueId, 'color');

        if (!name) {
            name = device.friendlyName;
        }
        if (enabled === undefined) {
            enabled = true;
        }
        if (color === undefined) {
            color = {
                'red': 1,
                'green': 1,
                'blue': 1,
                'opacity': 1
            };
        }

        return {
            'deviceId': device.uniqueId,
            'deviceName': name,
            'enabled': enabled,
            'color': color,
        };
    }

    getDevice(deviceId) {
        for (let device of this._bluelight.detectedDevices) {
            if (device.uniqueId === deviceId) {
                return this._getDeviceData(device);
            }
        }

        return null;
    }

    getDevices() {
        let devices = [];
        for (let device of this._bluelight.detectedDevices) {
            devices.push(this._getDeviceData(device));
        }
        return devices;
    }
}
util.inherits(Manager, events.EventEmitter);

module.exports = Manager;