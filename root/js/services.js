"use strict";

var services = angular.module("scandalousServices", []);

services.factory("Backend", function() {
    return {
        //default domain of scandalous backend
        domain: "localhost",
        //default port of scadalous backend
        port: "80/backend",
        //get URL of scandalous backend
        url: function() {
            return "http://"+this.domain+":"+this.port+"/";
        }
    };
});

services.factory("Selection", function() {
    return {
        //list of node objects to cache nodes from backend
        nodes: [],
        /**
         * set selected node as active
         * limit the number of active nodes to 1. The only time there is no
         * active node is at start up
         */
        toggleNodes: function(node) {
            for (var i = 0; i < this.nodes.length; ++i) {
                this.nodes[i].isActive = false;
                if (this.nodes[i].node === node.node) {
                    this.nodes[i].isActive = true;
                }
            }
        },
        /**
         * get the active node in the list of all nodes
         * @return {node, device, isActive}
         */
        getActiveNode: function() {
            for (var i = 0; i < this.nodes.length; ++i) {
                if (this.nodes[i].isActive) {
                    return this.nodes[i];
                }
            }
        },
        //list of channel objects to cache channels from backend
        channels: [],
        /**
         * set given channel as active if it is currently inactive,
         * inactive otherwise. limit number of active channels to 2
         */
        toggleChannels: function(channel) {
            var activeChannels = this.getActiveChannels();
            //allow max of 2 selected channels
            if (activeChannels.length === 2) {
                for (var i = 0; i < activeChannels.length; ++i) {
                    if (activeChannels[i].channel === channel.channel) {
                        activeChannels[i].isActive = !channel.isActive;
                    }
                }
            } else {
                for (var i = 0; i < this.channels.length; ++i) {
                    if (this.channels[i].channel === channel.channel) {
                        this.channels[i].isActive = !this.channels[i].isActive;
                    }
                }
            }
        },
        /**
         * get the active channels in the list of all channels
         * @return [{channel, value, isActive}]
         */
        getActiveChannels: function() {
            var activeChannels = [];
            for (var i = 0; i < this.channels.length; ++i) {
                if (this.channels[i].isActive) {
                    activeChannels.push(this.channels[i]);
                }
            }
            return activeChannels;
        },
    };

});

services.factory("Data", function() {
    return {
        data: [],

    };
});
