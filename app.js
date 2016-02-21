'use strict';

const
    Manager = require('./manager'),
    express = require('express'),
    expressWs = require('express-ws');

let app = express(),
    manager = new Manager(),
    ws = expressWs(app).getWss();

function broadcast(data) {
    let message = JSON.stringify(data);
    for (let client of ws.clients) {
        client.send(message);
    }
}

manager.on('error', (err) => {
    console.error(err);
})

// forward events
for (let eventName of ['deviceDiscovered', 'deviceLost', 'scanStarted', 'scanStopped', 'lightEnabled', 'lightDisabled', 'colorSet', 'deviceRenamed']) {
    (function (eventName) {
        manager.on(eventName, (properties) => {
            properties = properties || {};
            properties.type = eventName;
            broadcast(properties);
        });
    })(eventName);
}

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
                manager.startScanning();
                break;
            case 'enableLight':
                manager.enableLight(data.deviceId);
                break;
            case 'disableLight':
                manager.disableLight(data.deviceId);
                break;
            case 'setColor':
                try {
                    manager.setColor(data.deviceId, data.color);
                } catch (err) {
                    send({
                        'type': 'error',
                        'message': err
                    });
                }
                break;
            case 'getDevices':
                send({
                    'type': 'listOfDevices',
                    'devices': manager.getDevices()
                });
                break;
            case 'renameDevice':
                manager.renameDevice(data.deviceId, data.newName);
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