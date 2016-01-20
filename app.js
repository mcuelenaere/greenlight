'use strict';

const
    Bluelight = require('bluelight'),
    express = require('express'),
    expressWs = require('express-ws');

let app = express(),
    bluelight = new Bluelight(),
    ws = expressWs(app).getWss();

function broadcast(data) {
    let message = JSON.stringify(data);
    for (let client of ws.clients) {
        client.send(message);
    }
}

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

bluelight.on('error', (err) => {
    console.error(err);
});

bluelight.on('discover', (device) => {
    broadcast({
        'type': 'deviceDiscovered',
        'deviceId': device.uniqueId,
        'deviceName': device.friendlyName
    });
});

bluelight.on('disconnect', (device) => {
    broadcast({
        'type': 'deviceLost',
        'deviceId': device.uniqueId,
        'deviceName': device.friendlyName
    });
});

bluelight.on('scanStop', () => {
    broadcast({
        'type': 'scanStopped'
    });
});

// bind middlewares
app.use(express.static('static'));

// routes
app.get('/', (req, res) => {
    // homepage is located in static
    res.redirect('/static/index.html', 302);
});

app.ws('/api/', (ws, req) => {
    let send = (data) => {
        ws.send(JSON.stringify(data));
    };

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            send({
                'type': 'error',
                'message': 'Received message is not valid JSON'
            });
            return;
        }

        if (typeof data !== 'object') {
            send({
                'type': 'error',
                'message': 'Received message is not an object'
            });
            return;
        }

        switch (data.type) {
            case 'startScanning':
                bluelight.scanFor(5000);
                broadcast({
                    'type': 'scanStarted'
                });
                break;
            case 'enableLight':
                for (let device of bluelight.detectedDevices) {
                    if (device.uniqueId === data.deviceId) {
                        device.enableLight();
                        broadcast({
                            'type': 'lightEnabled',
                            'deviceId': device.uniqueId
                        });
                        break;
                    }
                }
                break;
            case 'disableLight':
                for (let device of bluelight.detectedDevices) {
                    if (device.uniqueId === data.deviceId) {
                        device.disableLight();
                        broadcast({
                            'type': 'lightDisabled',
                            'deviceId': device.uniqueId
                        });
                        break;
                    }
                }
                break;
            case 'setColor':
                try {
                    validateColor(data.color);
                } catch (err) {
                    send({
                        'type': 'error',
                        'message': 'Invalid color sent: ' + err
                    });
                    break;
                }

                let color = data.color;
                for (let device of bluelight.detectedDevices) {
                    if (device.uniqueId === data.deviceId) {
                        device.setColor(color.red, color.green, color.blue, color.opacity);
                        broadcast({
                            'type': 'colorSet',
                            'deviceId': device.uniqueId,
                            'color': color
                        });
                        break;
                    }
                }
                break;
            case 'getDevices':
                let devices = [];
                for (let device of bluelight.detectedDevices) {
                    devices.push({
                        'deviceId': device.uniqueId,
                        'deviceName': device.friendlyName
                    });
                }
                send({
                    'type': 'listOfDevices',
                    'devices': devices
                });
                break;
            default:
                send({
                    'type': 'error',
                    'message': 'Received message contains an unknown type'
                });
                break;
        }
    });
});

// start app
app.listen(8000);