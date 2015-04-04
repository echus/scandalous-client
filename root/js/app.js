var app = angular.module("myApp", [])

app.factory("_backend", function($http) {
    return {
        //default domain of scandalous backend
        domain: "localhost",
        //default port of scadalous backend
        port: "80/backend",
        /**
         * performs HTTP GET and returns data from server.
         * @param pathQuery path after / and query required to locate resource
         *   from server. e.g. packets?node=10&ch=12
         */
        getData: function(pathQuery) {
            var url = "http://"+this.domain+":"+this.port+"/"+pathQuery
            console.log("request: " + url)
            return $http.get(url).then(
                function(response) {
                    //on successful GET return data
                    console.log(response.status + " " + response.statusText)
                    return response.data
                },
                function(response) {
                    //on unsuccessful GET return null
                    console.log(response.status + " " + response.statusText)
                    return null
                }
            )
        },
        postData: function(pathQuery, data) {
            var url = "http://"+this.domain+":"+this.port+"/"+pathQuery
            console.log("request: " + url + data)
            return $http.get(url).then(
                function(response) {
                    //on successful GET return data
                    console.log(response.status + " " + response.statusText)
                    return response.data
                },
                function(response) {
                    //on unsuccessful GET return null
                    console.log(response.status + " " + response.statusText)
                    return null
                }
            )

        },
    }
})

app.factory("_nodes", function(_backend) {
    return {
        //list of node objects to cache nodes from backend
        data: [],
        /**
         * set selected node as active
         * limit the number of active nodes to 1. The only time there is no
         * active node is at start up
         */
        toggle: function(node) {
            for (var i = 0; i < this.data.length; ++i) {
                this.data[i].isActive = false
                if (this.data[i].node === node.node) {
                    this.data[i].isActive = true
                }
            }
        },
        /**
         * get the active node in the list of all nodes
         * @return {node, device, isActive}
         */
        getActiveNode: function() {
            for (var i = 0; i < this.data.length; ++i) {
                if (this.data[i].isActive) {
                    return this.data[i]
                }
            }
        },
            
    }
})
app.factory("_channels", function(_backend, _nodes) {
    return {
        data: [],
        /**
         * Get all channels from server and set them all inactive
         */
        getChannels: function() {
            var url = "nodes/"+_nodes.getActiveNode.node+"/channels"
            _backend.getData(url).then(function(channels) {
                this.data = channels
                //add isActive attribute to each channel
                for (var i = 0; i < this.data.length; ++i) {
                    this.data[i].isActive = false
                }
            })
        },
        /**
         * set given channel as active if it is currently inactive,
         * inactive otherwise. limit number of active channels to 2
         */
        toggle: function(channel) {
            var activeChannels = this.getActiveChannels()
            //allow max of 2 selected channels
            if (activeChannels.length === 2) {
                for (var i = 0; i < activeChannels.length; ++i) {
                    if (activeChannels[i].channel === channel.channel) {
                        activeChannels[i].isActive = !channel.isActive
                        console.log(activeChannels[i].channel)
                    }
                }
            } else {
                for (var i = 0; i < this.data.length; ++i) {
                    if (this.data[i].channel === channel.channel) {
                        this.data[i].isActive = !this.data[i].isActive
                    }
                }
            }
        },
        /**
         * get the active channels in the list of all channels
         * @return [{channel, value, isActive}]
         */
        getActiveChannels: function() {
            var activeChannels = []
            for (var i = 0; i < this.data.length; ++i) {
                if (this.data[i].isActive) {
                    activeChannels.push(this.data[i])
                }
            }
            return activeChannels
        },
    }
})

app.factory("_format", function() {
    return {
        /**
         * Given a date in dateTime format, returns the time in 24hr format
         * @param dateTime dateTime string YYYY-MM-DDTHH:mm:ss
         * @return time in the format HH:mm:ss
         */
        formatTime: function(dateTime) {
            var parsedDate = new Date(dateTime)
            return addPadding(parsedDate.getHours())+":"+
                addPadding(parsedDate.getMinutes())+"."+
                addPadding(parsedDate.getSeconds())
        },
        /**
         * prefix numbers in the range [0, 9] with "0"
         * @param x number to be formatted
         * @return number as a string
         */
        addPadding: function(x) {
            if (x < 10 && x >= 0) {
                return "0" + x
            } else {
                return x
            }
        },
        /**
         * Get unit for channel reading
         * @param channel the channel name i.e. channel.value
         * @return unit as a string
         */
        getUnit: function(channel) {
            if (channel.search(/current/i) !== -1) {
                return "A"
            } else if (channel.search(/voltage/i) !== -1) {
                return "V"
            } else if (channel.search(/power/i) !== -1) {
                return "W"
            } else {
                return ""
            }
        },
    }
})

app.factory("_chart", function(_format) {
    return {
        /**
         * render chart redraws the whole chart.
         * used when columns need to be redrawn due to changes to selected
         * channels or during initialization
         * @param columns the axes and data to be plotted x, y1, y2
         * @return the chart that can be attached to the view
         */
        renderChart: function(columns) {
            var axes = {}
            var axis = {
                x: {
                    label: "Time",
                    tick: {
                        //show time as HH:mm:ss
                        format: function(x) {
                            return _format.formatTime(x)
                        },
                    }
                }
            }
            var labels = ['y', 'y2']
            for (var i = 1; i < columns.length; ++i) {
                //bind data to corresponding axes
                axes[columns[i][0]] = labels[i - 1]
                //label and show axes appropriately
                axis[labels[i - 1]] = {label: columns[i][0], show: true}
            }
            console.log(axes)
            return {
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
            }
        },

    }
})

app.factory("_data", function() {
    return {
        data: [],
        limit: 50,
        /**
         * Get packets based on node and channel selected from backend,
         * remove duplicates based on time per channel.
         * @param node the node.node selected
         * @param channels list of channel.channel values selected
         * @return list of lists of channel data partitioned by channel ordered
         *      by descending time
         */
        getData: function(node, channel) {
            var parsedPackets = [];
            var url = "packets?node="+node+"&limit="+this.limit*10
            _backend.getData(url).then(function(allPackets) {
                for (var i = 0; i < channels.length; ++i) {
                    //filter packets by channel and
                    //remove duplicates based on time
                    var currPacketTime = ""
                    var packets = allPackets.filter(function(element) {
                        if (channels[i] === element.channel &&
                                currPacketTime !== element.time) {
                            currPacketTime = element.time
                            return true
                        } else {
                            return false
                        }
                    })
                    parsedPackets.push(packets);
                }
            })
            return parsedPackets;
        },

    }
})
/**
 * CONTROLLERS
 */
app.controller("nodeCtrl", function($scope, _backend, _nodes, _channels) {
    /**
     * update cached nodes from the backend
     */
    $scope.updateNodes = function() {
        var a
        _backend.getData("nodes").then(function(nodes) {
            //set all nodes as inactive
            for (var i = 0; i < nodes.length; ++i) {
                nodes[i].isActive = false
            }
            a = nodes
            _nodes.data = nodes
            $scope.nodes = _nodes.data
            //clear cached channels as no nodes are selected
//            _channels.data = []
            console.log(_nodes.data)
            console.log(a)
        })
        console.log(_nodes.data)
        console.log(a)
    }
    /**
     * change selected node and update cached channels from backend
     * based on selected node
     */
    $scope.toggle = function(node) {
        console.log(_channels.data)
        _nodes.toggle(node)
        var url = "nodes/"+_nodes.getActiveNode().node+"/channels"
        _backend.getData(url).then(function(channels) {
            //set all channels as inactive
            for (var i = 0; i < channels.length; ++i) {
                channels[i].isActive = false
            }
            _channels.data = channels
            console.log(_channels.data)
        })
    }
    /**
     * initialisation consists of:
     * gettting all available nodes from backend
     */
    function init() {
        $scope.updateNodes()
    }
    init()
    $scope.test = function() {
        _nodes.data.push({node: 5, device: "shit"})
        console.log(_nodes.data)
    }
})
app.controller("channelCtrl", function($scope, _nodes, _channels) {
        $scope.channels = _channels.data
    $scope.getChannels = function() {
        _nodes.getChannels()
        $scope.channels = _channels.data
    }
    $scope.toggle = function(channel) {
        _channels.toggle(channel)
        $scope.channels = _channels.data
    }
    function init() {
    }
    init()
    $scope.test = function() {
        console.log($scope.channels)
        console.log(_channels.data)
    $scope.channels = _channels.data
    }
})

app.controller("formCtrl", ["$scope", "_backend", function($scope, _backend) {
    //$scope.nodes = h
}])
/*
 * controller used to set/get domain of scandalous backend
 */
app.controller("domainCtrl", ["$scope", "_backend",
        function($scope, _backend) {
    $scope.domain = _backend.domain
    //sets domain of backend in _backend to given domain
    $scope.setDomain = function(domain) {
        _backend.domain = domain
        console.log("domain changed to " + _backend.domain)
    }
}])

/*
 * controller used to get/set port of scandalous backend
 */
app.controller("portCtrl", ["$scope", "_backend", function($scope, _backend) {
    $scope.port = _backend.port
    //sets port of backend in _backend to given port
    $scope.setPort = function(port) {
        _backend.port = port
        console.log("port changed to " + _backend.port)
    }
}])
