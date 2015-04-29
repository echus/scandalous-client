"use strict";

var ctrls = angular.module("scandalousControllers", []);

ctrls.controller("BackendCtrl",
        function($scope, $http, Backend, Selection) {

    $scope.domain = Backend.domain;
    //sets domain of backend in _backend to given domain
    $scope.setDomain = function(domain) {
        Backend.setDomain(domain);
        console.log("domain changed to " + Backend.domain);
    }

    $scope.port = Backend.port;
    //sets port of backend in _backend to given port
    $scope.setPort = function(port) {
        Backend.setPort(port);
        console.log("port changed to " + Backend.port);
    }

    $scope.updateNodes = function() {
        $http.get(Backend.url()+"nodes").
        success(function(nodes) {
            Selection.setNodes(nodes);
            Selection.setChannels([]);
        }).
        error(function(data, status) {
            console.log(status);
            console.log(data);
        })
    };
    $scope.updateNodes();
});

ctrls.controller("SelectionCtrl",
        function($scope, $http, Selection, Backend) {

    /**
     * change selected node and update cached channels from backend
     * based on selected node
     */
    $scope.toggleNodes = function(node) {
        Selection.toggleNodes(node);

        var path = "nodes/"+
            Selection.getActiveNode().node+
            "/channels";
        $http.get(Backend.url() + path).
        success(function(channels) {
            Selection.setChannels(channels);
            $scope.channels = Selection.channels;
        }).
        error(function(data, status) {
            console.log(status);
            console.log(data);
        });
    };

    $scope.toggleChannels = function(channel) {
        Selection.toggleChannels(channel);
    };

    var init = function() {
        $scope.nodes = Selection.nodes;
        $scope.channels = Selection.channels;
    }
    init();
    //listen for changes in Selection.nodes
    $scope.$on("nodes.update", function(event) {
        $scope.nodes = Selection.nodes;
    });
    //listen for changes in Selection.channels
    $scope.$on("channels.update", function(event) {
        $scope.channels = Selection.channels;
    })
});

ctrls.controller("graphCtrl",
        function($scope, $http, $attrs, $parse, $q, $interval, Backend, Data) {

    //active node and channels to query backend with
    var selections = [];
    /*
    console.log($attrs.selections)
    var p = $parse($attrs.selections)
    var q = p($scope)
    console.log(q)
    */
    //use hard set graph, parse nodes and channels
    if ($attrs.selections) {
        selections = $parse($attrs.selections)($scope);
    //using dynamic graph, attach listener to Data.selections to update
    //graph on node and channel changes
    } else {
        $scope.$on("selections.update", function(event) {
            selections = Data.selections;
            drawGraph();
        })

    }
    /*
        {
            node:1,
            device:"bat",
            channel:1,
            value:"curr"
        },
        {
            node:2,
            device:"mat",
            channel:3,
            value:"volt"
        }
    ];*/

    //call draw graph is there's a change in selections
    var drawGraph = function() {
        var axis = {
            x: {
                label: "Time",
                tick: {
                    //show time as HH:mm:ss
                    format: function(x) {
                        return Data.formatTime(x);
                    },
                }
            }
        };
        var axes = {};
        var columns = [["x"]];
        var labels = ['y', 'y2'];
        angular.forEach(selections, function(value, key) {
            //bind data to corresponding axes
            //{data1: 'y', data2: 'y2'}
            axes[value.value] = labels[key];
            //[[x],[data1],[data2]]
            columns.push([value.value]);
            //label and show axes appropriately
            //y: {label: data1}, y2: {label: data2}
            axis[labels[key]] = {
                label: value.value,
                show: true
            };

        });
        $scope.chart = {
            data: {
                type: "line",
                x: "x",
                columns: columns,
                axes: axes
            },
            axis: axis,
            subchart: {
                show: true
            },
            transition: {
                duration: 0
            }
        };
    }
    drawGraph();
    $scope.limit = 5;
    //http get in background keeps appending data to chart
    var updateGraph = function() {
        //columns (x, y1, y2) to be shown on graph and their data
        var columns = [];
        var requests = [];
        angular.forEach(selections, function(value, key) {
            var pathQuery = "packets?node="+value.node+
                "&ch="+value.channel+
                "&limit="+($scope.limit * 5);
            requests.push($http.get(Backend.url() + pathQuery).
                success(function(data) {
                    data = Data.filterPackets(data, $scope.limit);
                    //number of data points to display on graph
                    var dataLimit = Math.min(data.length, $scope.limit);
                    //add time data to columns if not added yet. time data must be
                    //inserted at columns[0]
                    if (columns.length === 0) {
                        //var timezoneOffset = new Date().getTimezoneOffset() * 60*1000;
                        var timeData = ["x"];
                        for (var i = 0; i < dataLimit; ++i) {
                            timeData.push(new Date(data[i].time).valueOf());// + timezoneOffset);
                        }
                        columns.push(timeData);
                    }
                    var channelData = [value.value];
                    //add channel data to columns
                    for (var i = 0; i < dataLimit; ++i) {
                        channelData.push(parseFloat(data[i].data.toFixed(2)));
                    }
                    columns.push(channelData);
                }).
                error(function(data, status) {
                    console.log(status);
                    console.log(data);
                }));
        });
        //once data has been received and formatted, update the graph to show
        //its new data
        $q.all(requests).then(function() {
            $scope.chart.data = {columns: columns};
        })
    }
    $interval(updateGraph, 1000, 0);
});

ctrls.controller("valueCtrl",
        function($scope, $http, $interval, Backend, Data) {

    $scope.values = [];
    var updateValue = function() {
        //remove unused cached values
        $scope.values.splice(-1, $scope.values.length - Data.selections.length);
        angular.forEach(Data.selections, function(value, key) {
            var pathQuery = "packets?node="+value.node+
            "&ch="+value.channel+"&limit=1";
            $http.get(Backend.url() + pathQuery).
            success(function(data) {
                $scope.values[key] = {
                    channel: value.value,
                    value: data[0].data,
                    unit: Data.getUnit(value.value)
                };
                $scope.timestamp = Data.formatTime(data[0].time);
            }).
            error(function(data, status) {
                console.log(status);
                console.log(data);
            });
        })
    };
    $interval(updateValue, 1000, 0);
});

ctrls.controller("formCtrl",
        function($scope, $http, Backend) {

    $scope.updateNodes = function() {
        $http.get(Backend.url()+"nodes").
        success(function(nodes) {
            $scope.nodes = nodes;
        }).
        error(function(data, status) {
            console.log(status);
            console.log(data);
        })
    };
    $scope.updateNodes();

    $scope.updateChannels = function(node) {
        var path = "nodes/"+node.node+"/channels"
        $http.get(Backend.url() + path).
        success(function(channels) {
            $scope.channels = channels;
        }).
        error(function(data, status) {
            console.log(status);
            console.log(data);
        })
    };

    /**
     * send data to backend
     */
    $scope.sendData = function() {
        if (!$scope.node) {
            $scope.feedback = "Node not selected";
        } else if (!$scope.channel) {
            $scope.feedback = "Channel not selected";
        } else if ($scope.data === undefined || $scope.data === null) {
            $scope.feedback = "Data not entered";
        } else {
            var msg = {
                node: $scope.node,
                channel: $scope.channel,
                data: $scope.data,
                msg_type: "I DON'T KNOW WHAT TO DO WITH YOU"
            };
            $http.post(Backend.url() + "packets/outbound", msg).
            success(function(data, status) {
                $scope.feedback = status+" "+data;
                /*
                if (status === 200) {
                    $scope.feedback = data
                } else if (status === 400) {
                    $scope.feedback = data.error
                }
                */
            }).
            error(function(data, status) {
                $scope.feedback = status+" "+data;
            });
        }

    }
});

ctrls.controller("mapCtrl", function($scope) {

    var coords = [
        [-25.86498, 133.38822, 511.7770385742188], 
        [-25.86485, 133.38805, 512.477783203125], 
        [-25.86423, 133.3869, 514.9624633789062], 
        [-25.85589, 133.35997, 508.6309509277344], 
        [-25.85338, 133.35295, 513.0886840820312], 
        [-25.850940000000005, 133.34682, 510.9010925292969], 
        [-25.83718, 133.31012, 516.8212280273438],
        [-25.8369, 133.30928, 516.2871704101562], 
        [-25.83656, 133.30787, 515.8281860351562], 
        [-25.83636, 133.30625, 514.0219116210938], 
        [-25.83627, 133.30412, 513.2046508789062], 
        [-25.83627, 133.30312, 513.7393798828125], 
        [-25.8363, 133.30259, 512.967529296875],
        [-25.83633, 133.30237000000002, 512.6470947265625], 
        [-25.83647, 133.30195, 512.0354614257812], 
        [-25.83658, 133.30175, 511.9368591308594], 
        [-25.83673, 133.30156, 511.7522277832031], 
        [-25.83683, 133.30146, 511.585693359375], 
        [-25.83695, 133.30137, 511.3641967773438], 
        [-25.83773, 133.30099, 511.0], 
        [-25.83861, 133.30039, 511.2364807128906], 
        [-25.83889, 133.30022, 511.4840393066406]
    ];


    var start = {
        lat: coords[0][0],
        lon: coords[0][1],
        label: {
            message: 'Start',
            show: false,
            showOnMouseOver: true
        }
    };
    var end = {
        lat: coords[coords.length-1][0],
        lon: coords[coords.length-1][1],
        label: {
            message: 'End',
            show: false,
            showOnMouseOver: true
        }
    }

    angular.extend($scope, {
        center: {
            lat: coords[0][0],
            lon: coords[0][1],
            zoom: 12,
            autodiscover: false
        },
        defaults: {
            interactions: {
                mouseWheelZoom: true
            },
            controls: {
                zoom: true,
                rotate: true,
                attribution: true 
            }
        },
        start: start,
        end: end
    });

    /**
     * @param coord GPS coordinate in the form of [lat, lon, alt]
     */
    var formatCoord = function(coord) {
        //swap lat with lon to match ol directive path format. remove alt
        return [coord[1], coord[0]];
    }

    $scope.coords = [
        [[133.38822, -25.86498], [133.38805, -25.86485]],
    ];
    var i = 2;
    $scope.update = function() {
        if (i === coords.length) return;

        var nextCoord = [];
        nextCoord.push($scope.coords[$scope.coords.length - 1][1]);
        nextCoord.push(formatCoord(coords[i++]));
        $scope.coords.push(nextCoord);
    }

});
/*
 [
    [-25.86498, 133.38822, 511.7770385742188],
    [-25.86485, 133.38805, 512.477783203125],
    [-25.86423, 133.3869, 514.9624633789062],
    [-25.85589, 133.35997, 508.6309509277344]
]
 */