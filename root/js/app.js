var app = angular.module("myApp", []);

app.factory("_data", function($http) {
  return {
    //default domain of scandalous backend
    domain: "0.0.0.0",
    //default port of scadalous backend
    port: "8080",
    //data samples from server corresponding to selected node and channel
    values: {
      //packets from server stored in a circular array of predefined size
      packets: new Array(10),
      //index for next oldest packet in packets
      head: 0,
      //index for next newest packet in packets
      tail: 1,
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
    },
    currState: {
      //current node selected
      node: {
        node: "1",
        device: "motor"
      },
      //current channel selected
      channel: {
        channel: "2",
        value: "current"
      },
      //current number of unsuccessful HTTP GETs
      heartbeat: 0
    },
    //number of unsuccessful HTTP GETS before backend is assumed dead
    heartbeatLimit: 3,
    /**
     * performs HTTP GET and returns data from server.
     * @param pathQuery path including / and query required to locate resource
     *   from server. e.g. /packets?node=10&ch=12
     */
    getData: function(pathQuery) {
      var url = "http://"+this.domain+":"+this.port+pathQuery;
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
  $scope.getUnit = function() {
    var channel = _data.currState.channel.value;
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
  $scope.getValues = function() {
    if (_data.currState.node !== "" && _data.currState.channel !== "") {
      //var url = "/nodes/"+_data.currState.node.node+"/channel/"+_data.currState.channel.channel+".json";
      var url = "/packets?node="+_data.currState.node.node+"&ch="+_data.currState.channel.channel;
      _data.getData(url).then(function(values) {
        if (values !== null) {
          _data.currState.heartbeat = 0;
          $scope.value = {
            value : values[0].data,
            unit : $scope.getUnit()
          };

          $scope.timestamp = {
            value : values[0].time,
            style : "text-center"
          };
          //update chart
          var temp = [values[0]];
          setChart(temp);
        } else {
          ++_data.currState.heartbeat;
          if (_data.currState.heartbeat >= _data.heartbeatLimit) {
            $scope.timestamp.style = "text-center text-danger";
          }
        }
      });
    }
  };
  //returns true if node is selected, false otherwise
  $scope.isSelected = function(isNode, value) {
    if (isNode) {
      return _data.currState.node.node === value;
    } else {
      return _data.currState.channel.channel === value;
    }
  };
  //sets current node in _data to the given node
  $scope.setSelected = function(isNode, value) {
    if (isNode) {
      _data.currState.node = value;
      _data.currState.channel = "";
      $scope.getChannels();
    } else {
      _data.currState.channel = value;
      setChart();
    }
  };
  $scope.getNodes = function() {
    //attempt to get all nodes
    //var url = "/example_nodes.json";
    var url = "/nodes";
    _data.getData(url).then(function(nodes) {
      $scope.nodes = nodes;
      //clear selections and cached channels on node refresh
      _data.currState.node = "";
      _data.currState.channel = "";
      $scope.channels = "";
    });
  };
  $scope.getChannels = function() {
    //var url = "/nodes/"+_data.currState.node.node+"/example_channels.json";
    var url = "/node/"+_data.currState.node.node+"/channels";
    _data.getData(url).
        then(function(channels) {
      $scope.channels = channels;
    });
  };
  function setChart(packets) {
    $scope.chart.flow({
      json: packets,
      keys: {
        x: "time",
        value: ["data"]
      }
    });
  }
  //init
  (function() {
    //get all nodes
    $scope.getNodes();
    //start task to get realtime value every second
    $interval($scope.getValues, 1000);
    //init chart
    $scope.chart = c3.generate({
      bindto: "#chart",
      data: {
        json: [
          {
            "time": "2014-12-20T07:36:41",
            "data": 12
          },
          {
            "time": "2014-12-20T07:36:42",
            "data": 13
          },
          {
            "time": "2014-12-20T07:36:43",
            "data": 14
          },
          {
            "time": "2014-12-20T07:36:44",
            "data": 15
          },
          {
            "time": "2014-12-20T07:36:45",
            "data": 16
          }
        ],
        keys: {
          x: "time",
          value: ["data"]
        }
      },
      axis: {
        x: {
          label: "Time",
          type: "category",
          tick: {
            count: 10
          }
        },
        y: {
          label: "Value"
        }
      },
      legend: {
        hide: true
      },
      subchart: {
        show: true
      }
    });
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

