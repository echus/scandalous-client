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
            requests.push(
                $http.get(Backend.url() + pathQuery).
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
                })
            );
        });
        //once data has been received and formatted, update the graph to show
        //its new data
        $q.all(requests).then(function() {
            $scope.chart.data = {columns: columns};
        })
    }
    $interval(updateGraph, 1000, 1);
});