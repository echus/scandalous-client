"use strict";

var ctrls = angular.module("scandalousControllers", []);

ctrls.controller("SelectionCtrl",
    function($scope, $http, Selection, Backend) {

        $scope.updateNodes = function() {
            $http.get(Backend.url()+"nodes").
            success(function(nodes) {
                console.log(nodes)
                //set all nodes as inactive
                for (var i = 0; i < nodes.length; ++i) {
                    nodes[i].isActive = false;
                }
                Selection.nodes = nodes;
                $scope.nodes = Selection.nodes;
            }).
            error(function(data, status) {
                console.log(status)
                console.log(data)
            })
        };

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
                //set all channels as inactive
                for (var i = 0; i < channels.length; ++i) {
                    channels[i].isActive = false;
                }
                Selection.channels = channels;
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
            $scope.nodes = [];
            $scope.channels = [];
            $scope.updateNodes();
        }
        init();

});
