'use strict';

const
    Manager = require('./manager'),
    bodyParser = require('body-parser'),
    express = require('express'),
    expressWs = require('express-ws');

let app = express(),
    manager = new Manager(),
    ws = expressWs(app).getWss();

let apiEventSubscribers = [];

function broadcast(type, data) {
    let wsData = data || {};
    wsData.type = type;
    let message = JSON.stringify(wsData);
    for (let client of ws.clients) {
        client.send(message);
    }

    for (let subscriber of apiEventSubscribers) {
        subscriber(type, data);
    }
}

manager.on('error', (err) => {
    console.error(err);
})

// forward events
for (let eventName of ['deviceDiscovered', 'deviceLost', 'scanStarted', 'scanStopped', 'lightEnabled', 'lightDisabled', 'colorSet', 'deviceRenamed']) {
    (function (eventName) {
        manager.on(eventName, (properties) => {
            broadcast(eventName, properties);
        });
    })(eventName);
}

// bind middlewares
app.use(express.static('static'));
app.use(bodyParser.json());

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

app.post('/api/scan', (req, res) => {
    manager.startScanning();
    res.status(200).send();
});

app.get('/api/events', (req, res) => {
    //send headers for event-stream connection
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('\n');

    var messagePoster = function (type, message) {
        res.write('event: ' + type + '\n');
        res.write('data: ' + JSON.stringify(message) + '\n\n');
    };
    apiEventSubscribers.push(messagePoster);

    req.once('close', function () {
        // remove event subscriber
        apiEventSubscribers.splice(apiEventSubscribers.indexOf(messagePoster), 1);
    });
});

app.get('/api/devices', (req, res) => {
    res.json({
        'devices': manager.getDevices()
    });
});

app.get('/api/devices/:deviceId', (req, res) => {
    let result = manager.getDevice(req.params.deviceId);
    if (result === null) {
        res.status(404).send();
        return;
    }
    res.json({
        'device': result
    });
});

app.post('/api/devices/:deviceId/enable', (req, res) => {
    let result = manager.enableLight(req.params.deviceId);
    if (!result) {
        res.status(404);
    }
    res.send();
});

app.post('/api/devices/:deviceId/disable', (req, res) => {
    let result = manager.disableLight(req.params.deviceId);
    if (!result) {
        res.status(404);
    }
    res.send();
});

app.post('/api/devices/:deviceId/color', (req, res) => {
    try {
        let result = manager.setColor(req.params.deviceId, req.body.color);
        if (!result) {
            res.status(404);
        }
        res.send();
    } catch (err) {
        res.status(400).json({
            'error': err.message
        });
    }
});

app.post('/api/devices/:deviceId/rename', (req, res) => {
    let result = manager.renameDevice(req.params.deviceId, req.body.name);
    if (!result) {
        res.status(404);
    }
    res.send();
});

// start app
app.listen(8000);