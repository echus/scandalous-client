"use strict";

var services = angular.module("scandalousServices", []);

services.factory("Backend", function() {
    return {
        //default domain of scandalous backend
        domain: "localhost",
        setDomain: function(domain) {
            this.domain = domain;
        },
        //default port of scadalous backend
        port: "80/backend",
        setPort: function(port) {
            this.port = port;
        },
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
            $rootScope.$broadcast("channels.update");
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
            var selections = [];
            var activeNode = this.getActiveNode();
            angular.forEach(this.getActiveChannels(), function(value, key) {
                selections.push({
                    node: activeNode.node,
                    device: activeNode.device,
                    channel: value.channel,
                    value: value.value
                });
            });
            Data.updateSelections(selections);
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

services.factory("Data", function($rootScope) {
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
        selections: [],
        updateSelections: function(selections) {
            this.selections = selections;
            $rootScope.$broadcast("selections.update");
        },
        /**
         * Given packets of a single node and channel from the backend,
         * this function removes duplicates based on time and
         * reverses the order to ascending time order
         */
        filterPackets: function(allPackets, limit) {
            //remove packets with duplicate times
            var currTime = "";
            var packets = allPackets.filter(function(element) {
                if (element.time !== currTime) {
                    currTime = element.time;
                    return true;
                } else {
                    return false;
                }
            });
            //take latest subset of data
            packets.splice(limit, Number.MAX_VALUE)
            //order packets by ascending time (newest last)
            packets.reverse();
            return packets;
        },
        /**
         * Given a date in dateTime format, returns the time in 24hr format
         * @param dateTime dateTime string YYYY-MM-DDTHH:mm:ss
         * @return time in the format HH:mm:ss
         */
        formatTime: function(dateTime) {
            /**
             * prefix numbers in the range [0, 9] with "0"
             * @param x number to be formatted
             * @return number as a string
             */
            var addPadding = function(x) {
                if (x < 10 && x >= 0) {
                    return "0" + x
                } else {
                    return x
                }
            };
            var parsedDate = new Date(dateTime)
            return addPadding(parsedDate.getHours())+":"+
                addPadding(parsedDate.getMinutes())+"."+
                addPadding(parsedDate.getSeconds())
        },
        /**
         * Get unit for channel reading
         * @param channel the channel name i.e. channel.value
         * @return unit as a string
         */
        getUnit: function(channelName) {
            if (channelName.search(/current/i) !== -1) {
                return "A"
            } else if (channelName.search(/voltage/i) !== -1) {
                return "V"
            } else if (channelName.search(/power/i) !== -1) {
                return "W"
            } else {
                return "Unit"
            }
        },

    };
});
