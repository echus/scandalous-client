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
            console.log(nodes);
            Selection.setNodes(nodes);
            Selection.setChannels([]);
        }).
        error(function(data, status) {
            console.log(status);
            console.log(data);
        })
    };

    var init = function() {
        $scope.updateNodes();
    }
    init();
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
            console.log(channels);
            Selection.setChannels(channels);
            $scope.channels = Selection.channels;
        }).
        error(function(data, status) {
            console.log(status)
            console.log(data)
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
        function($scope, $http, Backend) {

    //active node and channels to query backend with
    var selections = [
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
    ];
    //http get in backgroup keeps appending data to chart


    //call draw graph is there's a change in selections
    $scope.drawGraph = function() {
        var axis = {
            x: {
                label: "Time",
                tick: {
                    //show time as HH:mm:ss
                    format: function(x) {
                        return (x);
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
    /**
     * set graph nodes and channels for graph with constant nodes and channels
     */
    $scope.setGraph = function(selections) {
        if (selections) {
            this.selections = selections;
        }
    }
    var init = function() {
        $scope.setGraph();
                    console.log(selections)

        $scope.drawGraph();
    }
    init();
});
/*
controller: function($scope, $http, Backend) {

            $scope.renderGraph = function() {
                angular.forEach(arguments, function(value, key) {
                    var path = "packets?node="+value.node+"&ch="+value.channel;
                    $http.get(Backend.url() + path).
                    success(function(data) {
                        $scope.data.push(data);
                    }).
                    error(function(data, status) {
                        console.log(status);
                        console.log(data);
                    });
                });
            };
        },
*/