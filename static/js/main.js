(function () {
    var app = angular.module('GreenLight', []);

    app.factory('Api', function ($rootScope) {
        var
            ws = new WebSocket('ws://' + window.location.host + '/api/'),
            bootstrapMessages = [];

        function send(msg) {
            if (ws.readyState == WebSocket.CONNECTING) {
                bootstrapMessages.push(msg)
            } else if (ws.readyState == WebSocket.OPEN) {
                ws.send(JSON.stringify(msg));
            } else {
                throw new Error('WebSocket is not connected!');
            }
        }

        ws.onmessage = function (e) {
            var data = JSON.parse(e.data);
            switch (data.type) {
                case 'error':
                    console.error(data.error);
                    break;
                default:
                    $rootScope.$applyAsync(function () {
                        $rootScope.$emit('api-service-event', data);
                    });
                    break;
            }
        };
        ws.onopen = function () {
            bootstrapMessages.forEach(function (msg) {
                send(msg);
            });
            bootstrapMessages = [];
        };

        return {
            on: function ($scope, event, callback) {
                var handler = $rootScope.$on('api-service-event', function (_, msg) {
                    if (msg.type === event) {
                        callback(msg);
                    }
                });
                $scope.$on('$destroy', handler);
            },
            disableLight: function (deviceId) {
                send({'type': 'disableLight', 'deviceId': deviceId});
            },
            enableLight: function (deviceId) {
                send({'type': 'enableLight', 'deviceId': deviceId});
            },
            setColor: function (deviceId, color) {
                send({'type': 'setColor', 'deviceId': deviceId, 'color': color});
            },
            scanForDevices: function () {
                send({'type': 'startScanning'});
            },
            getDeviceList: function () {
                send({'type': 'getDevices'});
            },
            renameDevice: function (deviceId, newName) {
                send({'type': 'renameDevice', 'deviceId': deviceId, 'newName': newName});
            }
        };
    });

    function parseColor(color) {
        var m = color.match(/^#([0-9a-f]{6})$/i)[1];
        if (m) {
            return [
                parseInt(m.substr(0, 2), 16),
                parseInt(m.substr(2, 2), 16),
                parseInt(m.substr(4, 2), 16)
            ];
        }
    }

    function dec2hex(d) {
        var hex = Number(d).toString(16);
        var padding = 2;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }

    function formatColor(color) {
        return '#' + dec2hex(color.red * 255) + dec2hex(color.green * 255) + dec2hex(color.blue * 255);
    }

    app.controller('HomeView', ['$scope', 'Api', function ($scope, Api) {
        $scope.isScanning = false;
        $scope.devices = {};

        Api.on($scope, 'deviceDiscovered', function (msg) {
            $scope.devices[msg.deviceId] = {
                'id': msg.deviceId,
                'name': msg.deviceName,
                'color': formatColor(msg.color),
                'opacity': msg.color.opacity,
                'enabled': msg.enabled
            };
        });

        Api.on($scope, 'deviceLost', function (msg) {
            delete $scope.devices[msg.deviceId];
        });

        Api.on($scope, 'deviceRenamed', function (msg) {
            if (msg.deviceId in $scope.devices) {
                $scope.devices[msg.deviceId].name = msg.name;
            }
        });

        Api.on($scope, 'lightDisabled', function (msg) {
            if (msg.deviceId in $scope.devices) {
                $scope.devices[msg.deviceId].enabled = false;
            }
        });

        Api.on($scope, 'lightEnabled', function (msg) {
            if (msg.deviceId in $scope.devices) {
                $scope.devices[msg.deviceId].enabled = true;
            }
        });

        Api.on($scope, 'listOfDevices', function (msg) {
            $scope.devices = {};
            msg.devices.forEach(function (device) {
                $scope.devices[device.deviceId] = {
                    'id': device.deviceId,
                    'name': device.deviceName,
                    'color': formatColor(device.color),
                    'opacity': device.color.opacity,
                    'enabled': device.enabled
                };
            });
            console.log($scope.devices);
        });

        Api.on($scope, 'scanStarted', function () {
            $scope.isScanning = true;
        });

        Api.on($scope, 'scanStopped', function () {
            $scope.isScanning = false;
        });

        $scope.scanForDevices = function () {
            Api.scanForDevices();
        };

        $scope.renameDevice = function (deviceId) {
            var currentName = $scope.devices[deviceId].name;
            var newName = prompt('What name do you want to give to this device?', currentName);
            if (newName && newName != currentName) {
                Api.renameDevice(deviceId, newName);
            }
        };

        $scope.changeColor = function (deviceId) {
            var color = parseColor($scope.devices[deviceId].color);
            var opacity = parseFloat($scope.devices[deviceId].opacity);
            Api.setColor($scope.selectedDevice, {
                'red': color[0] / 255,
                'green': color[1] / 255,
                'blue': color[2] / 255,
                'opacity': opacity
            });
        };

        $scope.toggleLight = function (deviceId) {
            var isEnabled = $scope.devices[deviceId].enabled;
            if (isEnabled) {
                Api.disableLight(deviceId);
            } else {
                Api.enableLight(deviceId);
            }
        };

        // get list of devices to bootstrap ourselves
        Api.getDeviceList();
    }]);
})();
