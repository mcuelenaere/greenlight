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

    app.controller('HomeView', ['$scope', 'Api', function ($scope, Api) {
        $scope.devices = [];

        Api.on($scope, 'deviceDiscovered', function (msg) {
            $scope.devices.push({
                'id': msg.deviceId,
                'name': msg.deviceName
            })
        });

        Api.on($scope, 'deviceLost', function (msg) {
            for (var i = 0; i < $scope.devices.length; i++) {
                if ($scope.devices[i].id === msg.deviceId) {
                    $scope.devices.splice(i, 1);
                    break;
                }
            }
        });

        Api.on($scope, 'listOfDevices', function (msg) {
            $scope.devices = [];
            msg.devices.forEach(function (device) {
                $scope.devices.push({
                    'id': device.deviceId,
                    'name': device.deviceName
                });
            });
        });

        $scope.scanForDevices = function () {
            Api.scanForDevices();
        };
        $scope.disableLight = function (device) {
            Api.disableLight(device);
        };
        $scope.enableLight = function (device) {
            Api.enableLight(device);
        };
        $scope.$watch('lightColor', function (newValue, oldValue) {
            if (!newValue) {
                return;
            }

            var color = parseColor(newValue);
            Api.setColor($scope.selectedDevice, {
                'red': color[0] / 255,
                'green': color[1] / 255,
                'blue': color[2] / 255,
                'opacity': 1.0
            });
        });

        // get list of devices to bootstrap ourselves
        Api.getDeviceList();
    }]);
})();
