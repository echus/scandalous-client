"use strict";

var ctrls = angular.module("scandalousControllers", []);

ctrls.controller("BackendCtrl",
        function($scope, $http, Backend, Selection) {

    $scope.domain = Backend.domain;
    //sets domain of backend in _backend to given domain
    $scope.setDomain = function(domain) {
        Backend.domain = domain;
        console.log("domain changed to " + Backend.domain);
    }

    $scope.port = Backend.port;
    //sets port of backend in _backend to given port
    $scope.setPort = function(port) {
        Backend.port = port;
        console.log("port changed to " + Backend.port);
    }

    $scope.updateNodes = function() {
        $http.get(Backend.url()+"nodes").
        success(function(nodes) {
            console.log(nodes);
            Selection.setNodes(nodes);
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
        })
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
});
