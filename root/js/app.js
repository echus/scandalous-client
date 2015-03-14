var app = angular.module("myApp", []);

app.factory("_data", function() {
    /**
   * Cyclic array class used to store a history of channel readings
   * @param size number of readings that can be stored
   */
  function CyclicArray(size) {
    //packets from server stored in a circular array of predefined size
    this.packets = new Array(size);
    //index for next oldest packet in packets
    this.head = 0;
    //index for next newest packet in packets
    this.tail = 1;
  }
  CyclicArray.prototype = {
    /**
     * inserts the oldest packet at head of packets array.
     * if packets is full after insertion, the newest packet is lost
     *
     * @param packet the oldest packet to be placed in packets
     * @precondition packets.length > 1
     */
    pushFront: function(packet) {
      this.packets[this.head--] = packet;
      //convert -ve index to +ve mod the length of packets
      this.head = (this.head + this.packets.length) % this.packets.length;
      //allow overwrite of newest element if array is full
      if (this.head === this.tail)
        --this.tail;
    },
    /**
     * inserts the newest packet at tail of packets array.
     * if packets is full after insertion, the oldest packet is lost
     *
     * @param packet the newest packet to be placed in packets
     * @precondition packets.length > 1
     */
    pushBack: function(packet) {
      this.packets[this.tail++] = packet;
      //wrap index around
      this.tail %= this.packets.length;
      //allow overwrite of oldest element if array is full
      if (this.head === this.tail)
        ++this.head;
    },
    /**
     * iterates packets array sequentially from head to tail and returns
     * an array containing a copy of all packets in order of head to tail.
     *
     * @return array with all packets in order
     */
    getInOrder: function() {
      var packetsInOrder = [];
      //get position of oldest element
      var i = (this.head + 1) % this.packets.length;
      while(i != this.tail) {
        packetsInOrder.push(this.packets[i++]);
        i %= this.packets.length;
      }
      return packetsInOrder;
    }
  };

  return {
    //default domain of scandalous backend
    domain: "0.0.0.0",
    //default port of scadalous backend
    port: "8080",
  };
});

/**
 * 
 */
app.controller("mainCtrl", ["$scope", "$http", "$interval", "$timeout", "_data",
    function($scope, $http, $interval, $timeout, _data) {
  /**
   * Get all nodes from server and set them all inactive
   */
  $scope.getNodes = function() {
    var url = "nodes";
    getData(url).then(function(nodes) {
      $scope.nodes = nodes;
      //add isActive attribute to each node
      for (var i = 0; i < $scope.nodes.length; ++i) {
        $scope.nodes[i].isActive = false;
      }
      //set selected node as active then query server for channels
      //limit the number of active nodes to 1. The only time there is no
      //active node is at start up
      $scope.nodes.toggle = function(node) {
        for (var i = 0; i < $scope.nodes.length; ++i) {
          $scope.nodes[i].isActive = false;
          if ($scope.nodes[i].node === node.node) {
            $scope.nodes[i].isActive = true;
          }
        }
        $scope.getChannels();
      }
      //clear cached channels on node refresh
      $scope.channels = [];
    });
  };
  /**
   * get the active node in the list of all nodes
   * @return $scope.node object
   */
  function getActiveNode() {
    for (var i = 0; i < $scope.nodes.length; ++i) {
      if ($scope.nodes[i].isActive) {
        return $scope.nodes[i];
      }
    }
  }
  /**
   * get the active channels in the list of all channels
   * @return list of $scope.channel object
   */
  function getActiveChannels() {
    var activeChannels = [];
    for (var i = 0; i < $scope.channels.length; ++i) {
      if ($scope.channels[i].isActive) {
        activeChannels.push($scope.channels[i]);
      }
    }
    return activeChannels;
  }
  /**
   * Get all channels from server and set them all inactive
   */
  $scope.getChannels = function() {
    var url = "nodes/"+getActiveNode().node+"/channels";
    getData(url).then(function(channels) {
      $scope.channels = channels;
      //add isActive attribute to each channel
      for (var i = 0; i < $scope.channels.length; ++i) {
        $scope.channels[i].isActive = false;
      }
      //set active channel as inactive, vice versa, then refresh chart to
      //plot new data that corresponds to change in active channels
      $scope.channels.toggle = function(channel) {
        for (var i = 0; i < $scope.channels.length; ++i) {
          if ($scope.channels[i].channel === channel.channel) {
            $scope.channels[i].isActive = !$scope.channels[i].isActive;
          }
        }
        refreshChart();
      }
    });
  };
  /**
   * refresh chart, used only when active channels change as the whole graph
   * needs to be re-rendered.
   */
  function refreshChart() {
    var columns = [["x"]];
    //add new y axis data
    var activeChannels = getActiveChannels();
    for (var i = 0; i < activeChannels.length; ++i) {
      columns.push([activeChannels[i].value]);
    }
    $scope.chart = {
      data: {
        type: "line",
        x: "x",
        columns: columns
      },
      axis: {
        y: {
          //label: "y",
          show: true,
          tick: {
            format: function(y) {
              return y;
            }
          }
        },
        x: {
          label: "Time",
          tick: {
            //show time as HH:mm:ss
            format: function(x) {
              return $scope.parseTime(x);
            },
            //set the number of ticks to be shown, default 10
            culling: {
              //max: 5
            }
          }
        }
      },
      subchart: {
        show: true
      },
      legend: {
        //show: false
      },
      transition: {
        duration: 0
      }
    };
  }

  /**
   * performs HTTP GET and returns data from server.
   * @param pathQuery path after / and query required to locate resource
   *   from server. e.g. packets?node=10&ch=12
   */
  function getData(pathQuery) {
    var url = "http://"+_data.domain+":"+_data.port+"/"+pathQuery;
    console.log("request: " + url);
    return $http.get(url).then(
      function(response) {
        //on successful GET return data
        console.log(response.status + " " + response.statusText);
        return response.data;
      },
      function(response) {
        //on unsuccessful GET return null
        console.log(response.status + " " + response.statusText);
        return null;
      }
    );
  }

  /**
   * Given a date in dateTime format, returns the time in 24hr format
   * @param dateTime dateTime string YYYY-MM-DDTHH:mm:ss
   * @return time in the format HH:mm:ss
   */
  $scope.parseTime = function(dateTime) {
    var parsedDate = new Date(dateTime);
    return addPadding(parsedDate.getHours())+":"+
        addPadding(parsedDate.getMinutes())+"."+
        addPadding(parsedDate.getSeconds());
  }
  /**
   * prefix numbers in the range [0, 9] with "0"
   * @param x number to be formatted
   * @return number as a string
   */
  function addPadding(x) {
    if (x < 10 && x >= 0) {
      return "0" + x;
    } else {
      return x;
    }
  }
  /**
   * Get unit for channel reading
   * @param channel the channel name i.e. channel.value
   * @return unit as a string
   */
  $scope.getUnit = function(channel) {
    if (channel.search(/current/i) !== -1) {
      return "A";
    } else if (channel.search(/voltage/i) !== -1) {
      return "V";
    } else if (channel.search(/power/i) !== -1) {
      return "W";
    } else {
      return "";
    }
  }
  /**
   * Gets packets from server and update channel reading and plot new values to graph
   */
  function getValues() {
    var activeChannels = getActiveChannels();
    //do not get new values if either node or channel are not selected
    if (getActiveNode !== null && activeChannels.length > 0) {
      var columns = [];
      var url = "packets?node="+getActiveNode().node;
      getData(url).then(function(allPackets) {
        for (var i = 0; i < activeChannels.length; ++i) {
          //filter packets by channel and remove duplicates based on time
          var currPacketTime = "";
          var packets = allPackets.filter(function(element) {
            if (activeChannels[i].channel === element.channel && currPacketTime !== element.time) {
              currPacketTime = element.time;
              return true;
            } else {
              return false;
            }
          });
          var data = [];
          //add x axis time data in columns[0]
          if (columns.length === 0) {
            var timezoneOffset = new Date().getTimezoneOffset() * 60*1000;
            data.push("x");
            for (var j = Math.min(packets.length, $scope.limit); j > 0; --j) {
              data[j] = new Date(packets[j - 1].time).valueOf() + timezoneOffset;
            }
            columns.push(data);
            data = [];
          }
          //get a subset of values for chart
          data.push(activeChannels[i].value);
          for (var j = Math.min(packets.length, $scope.limit); j > 0; --j) {
            data[j] = parseFloat(packets[j - 1].data.toFixed(2));
          }
          columns.push(data);
        }
        //plot new values to chart
        $scope.chart.data = {columns: columns};
      });
    }
  }

  //init
  (function() {
    //initial max limit of data points on chart
    $scope.limit = 50;
    //get all nodes
    $scope.getNodes();
    //start task to get realtime value every second
    $interval(getValues, 1000);
    //init chart
    $scope.chart = {
      data: {
        type: "line",
        x: "x",
        columns: [
          ["x"],
          ["data"]
        ]
      },
      axis: {
        y: {
          //label: "y",
          show: true,
          tick: {
            format: function(y) {
              return y;
            }
          }
        },
        x: {
          label: "Time",
          tick: {
            //show time as HH:mm:ss
            format: function(x) {
              return $scope.parseTime(x);
            },
            //set the number of ticks to be shown, default 10
            culling: {
              //max: 5
            }
          }
        }
      },
      subchart: {
        show: true
      },
      legend: {
        //show: false
      },
      transition: {
        duration: 0
      }
    };
  })();
}]);

/*
 * controller used to set/get domain of scandalous backend
 */
app.controller("domainCtrl", ["$scope", "_data",
    function($scope, _data) {
  $scope.domain = _data.domain;
  //sets domain of backend in _data to given domain
  $scope.setDomain = function(domain) {
    _data.domain = domain;
    console.log("domain changed to " + _data.domain);
  };
}]);

/*
 * controller used to get/set port of scandalous backend
 */
app.controller("portCtrl", ["$scope", "_data",
    function($scope, _data) {
  $scope.port = _data.port;
  //sets port of backend in _data to given port
  $scope.setPort = function(port) {
    _data.port = port;
    console.log("port changed to " + _data.port);
  };
}]);

