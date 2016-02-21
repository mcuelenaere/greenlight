# greenlight

Simple web UI frontend + REST API for [bluelight](https://github.com/mcuelenaere/bluelight)

## Install

```sh
git clone https://github.com/mcuelenaere/greenlight
```

## Usage

```sh
node app.js
```

Open [http://localhost:8000/](http://localhost:8000/) in your browser to use the GUI.

### REST API

#### General

##### Scan for devices

```sh
curl -XPOST http://localhost:8000/api/scan
```

##### Get event stream

```sh
curl http://localhost:8000/api/events
```

This returns a [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events) stream.

##### Get list of devices

```sh
curl http://localhost:8000/devices
```

returns

```json
{
  "devices": [
    {
      "deviceId": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "deviceName": "LEDBLE-XXXXXXXX",
      "enabled": true,
      "color": { "red": 1.0, "green": 1.0, "blue": 1.0, "opacity": 1.0 }
    }
  ]
}
```

#### Devices

##### Get device info

```sh
curl http://localhost:8000/devices/1234
```

returns

```json
{
  "device": [
    {
      "deviceId": "1234",
      "deviceName": "LEDBLE-1234",
      "enabled": true,
      "color": { "red": 1.0, "green": 1.0, "blue": 1.0, "opacity": 1.0 }
    }
  ]
}
```

##### Enable light

```sh
curl -XPOST http://localhost:8000/devices/1234/enable
```

##### Disable light

```sh
curl -XPOST http://localhost:8000/devices/1234/disable
```

##### Set light color

```sh
curl -XPOST http://localhost:8000/devices/1234/color -H 'Content-Type: application/json' -d '{"color":{"red":1.0,"green":0.0,"blue":0.0,"opacity":1.0}}'
```

##### Rename device

```sh
curl -XPOST http://localhost:8000/devices/1234/rename -H 'Content-Type: application/json' -d '{"name": "foobar"}'
```

### WebSocket API

```javascript
var ws = new WebSocket('ws://localhost:8000/api/'),
ws.onmessage = function (e) {
    console.log(JSON.parse(e.data));
};
ws.onopen = function () {
    ws.send(JSON.stringify({'type': 'getDevices'});
};
```

TODO: documentate me (see [the source](https://github.com/mcuelenaere/greenlight/blob/master/static/js/main.js) for now)
