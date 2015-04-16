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

services.factory("Selection", function($rootScope, Data) {
    return {
        //list of node objects to cache nodes from backend
        nodes: [],

        setNodes: function(nodes) {
            //set all nodes as inactive
            for (var i = 0; i < nodes.length; ++i) {
                nodes[i].isActive = false;
            }
            this.nodes = nodes;
            $rootScope.$broadcast("nodes.update");
        },
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

        setChannels: function(channels) {
            //set all channels as inactive
            for (var i = 0; i < channels.length; ++i) {
                channels[i].isActive = false;
            }
            this.channels = channels;
        },
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
            var activeSelection = [];
            var activeNode = this.getActiveNode();
            angular.forEach(this.getActiveChannels(), function(value, key) {
                activeSelection.push({
                    node: activeNode.node,
                    device: activeNode.device,
                    channel: value.channel,
                    value: value.value
                });
            });
            Data.setActiveSelection(activeSelection);
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
        //active node and channels to query backend with
        /*
        [{
            node:1,
            device:"bat",
            channel:1,
            value:"curr"
        }]
        */
        activeSelection: [],
        setActiveSelection: function(selections) {
            this.activeSelection = selections;
            console.log(this.activeSelection);
        },
        //packet data from backend based on activeSelection
        data: [],
        //maximum number of packets to store in data
        limit: 30,
        /**
         * Given packets of a single node and channel from the backend,
         * this function removes duplicates based on time and
         * reverses the order to ascending time order
         */
        filterPackets: function(packets) {
            //remove packets with duplicate times
            var currTime = "";
            packets = packets.filter(function(element) {
                if (element.time === currTime) {
                    currTime = element.time;
                    return true;
                } else {
                    return false;
                }
            });
            //order packets by ascending time (newest last)
            packets.reverse();
            this.data.push(packets);
        }

    };
});
