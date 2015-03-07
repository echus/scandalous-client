var app = angular.module("myApp", []);

app.factory("_data", function($http) {
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
 * using the selected node and channel:
 * -retrieve the most recent data packets from server (max 1000)
 * -display data as a graph
 * -display most recent value from server in the channel value section, to be
 *  updated every second
 */
app.controller("mainCtrl", ["$scope", "$http", "$interval", "$timeout", "_data",
    function($scope, $http, $interval, $timeout, _data) {
  /**
   * ************************************
   * All $scope functions and variables *
   * ************************************
   */
   /**
    * Determines whether a node or channel value is selected
    * @param isNode true is value is node, false if value is channel
    * @param value the node or channel value to be checked
    * @return true if selected, false otherwise
    */
  $scope.isSelected = function(isNode, value) {
    if (isNode) {
      return currState.node.node === value;
    } else {
      return currState.channel.channel === value;
    }
  };
  /**
   * Set node or channel value as selected
   * @param isNode true is value is node, false if value is channel
   * @param value the node or channel value to be selected
   */
  //sets current node in _data to the given node
  $scope.setSelected = function(isNode, value) {
    if (isNode) {
      currState.node = value;
      currState.channel = "";
      $scope.getChannels();
    } else {
      currState.channel = value;
      //setChart();
    }
  };
  $scope.getNodes = function() {
    //attempt to get all nodes
    //var url = "/example_nodes.json";
    var url = "/nodes";
    getData(url).then(function(nodes) {
      $scope.nodes = nodes;
      //clear selections and cached channels on node refresh
      currState.node = "";
      currState.channel = "";
      $scope.channels = "";
    });
  };
  $scope.getChannels = function() {
    //var url = "/nodes/"+currState.node.node+"/example_channels.json";
    var url = "/node/"+currState.node.node+"/channels";
    getData(url).
        then(function(channels) {
      $scope.channels = channels;
    });
  };
  $scope.chart = {
    data: {
      type: "line",
      x: "x",
      columns: [
        //["x", 0, 1],
        //["data1", 0, 2]
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
          //show time as HH:MM:SS
          format: function(x) {
            return parseTime(x);
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
      show: false
    },
    transition: {
      duration: 0
    }
  };

  /**
   * ***********************************
   * All local functions and variables *
   * ***********************************
   */
  /**
   * performs HTTP GET and returns data from server.
   * @param pathQuery path including / and query required to locate resource
   *   from server. e.g. /packets?node=10&ch=12
   */
  function getData(pathQuery) {
    var url = "http://"+_data.domain+":"+_data.port+pathQuery;
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
  function parseTime(dateTime) {
    var parsedDate = new Date(dateTime);
    var hours = parsedDate.getHours()
    return addPadding(parsedDate.getHours())+":"+
        addPadding(parsedDate.getMinutes())+"."+
        addPadding(parsedDate.getSeconds());
  }
  /**
   * prefix numbers in the range [0, 9] with "0"
   * @param x number to be formatted
   */
  function addPadding(x) {
    if (x < 10 && x >= 0) {
      return "0" + x;
    } else {
      return x;
    }
  }
  function getUnit() {
    var channel = currState.channel.value;
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
  function getValues() {
    if (currState.node !== "" && currState.channel !== "") {
      //var url = "/nodes/"+currState.node.node+"/channel/"+currState.channel.channel+".json";
      var url = "/packets?node="+currState.node.node+"&ch="+currState.channel.channel;
      getData(url).then(function(allPackets) {
        //retrieve all packets and remove duplicates based on time
        var currPacketTime;
        var packets = allPackets.filter(function(element) {
          if (currPacketTime !== element.time) {
            currPacketTime = element.time;
            return true;
          } else {
            return false;
          }
        })
        if (packets !== null) {
          //update live channel reading
          $scope.value = {
            value: packets[0].data.toFixed(2),
            unit: getUnit(),
            timestamp: parseTime(packets[0].time)
          };
          //get a subset of values for chart
          $scope.values.packets = [];
          for (var j = Math.min(packets.length, $scope.values.limit); j > 0; --j) {
            $scope.values.packets[j - 1] = packets[j - 1];
          }
          //update chart
          var time = ["x"];
          var data = [currState.channel.value];
          for (var i = 0; i < $scope.values.packets.length; ++i) {
            time.push((new Date($scope.values.packets[i].time).valueOf()));
            data.push($scope.values.packets[i].data);
          }
          $scope.chart.data = {
            columns: [
              time,
              data
            ],
          };
        }
      });
    }
  };

  //init
  (function() {
    //get all nodes
    $scope.getNodes();
    //start task to get realtime value every second
    $interval(getValues, 1000);
    //subset of channel readings of the size limit
    $scope.values = {
      packets: [],
      limit: 100
    };
    //init chart
  })();
  var currState = {
    //current node selected
    node: {
      node: "1",
      device: "motor"
    },
    //current channel selected
    channel: {
      channel: "2",
      value: "current"
    }
  };

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

