var app = angular.module("myApp", ["nvd3"]);

app.factory("_data", function($http) {
  return {
    //default domain of scandalous backend
    domain: "0.0.0.0",
    //default port of scadalous backend
    port: "8080",
    //all available nodes
    nodes: [],
    //all available channels
    channels: [],
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
      node: "",
      //current channel selected
      channel: "",
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
app.controller("valuesCtrl", ["$scope", "$http", "$interval", "_data",
    function($scope, $http, $interval, _data) {
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
  $scope.getValues = function() {
    if (_data.currState.node !== "" && _data.currState.channel !== "") {
      var url = "/nodes/"+_data.currState.node.node+"/channel/"+_data.currState.channel.channel+".json";
      //var url = "/packets?node="+_data.currState.node.node+"&ch="+_data.currState.channel.channel;
      _data.getData(url).then(function(values) {
        if (values !== null) {
          _data.currState.heartbeat = 0;
          $scope.value = {
              value : values[values.length - 1].data,
              unit : $scope.getUnit(_data.currState.channel.value)
          };

          $scope.timestamp = {
              value : values[values.length - 1].time,
              style : "text-center"
          };
          //setChart(values);
        } else {
          ++_data.currState.heartbeat;
          if (_data.currState.heartbeat >= _data.heartbeatLimit) {
            $scope.timestamp.style = "text-center text-danger";
          }
        }
      });
    }
  };
  function setChart(packets) {
    $scope.chart.load({
        json: packets,
        keys: {
            x: "time",
            value: ["data"]
        }
    });
  }
  //start process of retrieving channel values
  (function() {
    //start task to get realtime value every second
    $interval($scope.getValues, 1000);
    $scope.options = {
      chart: {
        type: 'lineWithFocusChart',
        height: 450,
        margin : {
          top: 20,
          right: 20,
          bottom: 60,
          left: 40
        },
        transitionDuration: 500,
        xAxis: {
          axisLabel: 'X Axis',
          tickFormat: function(d){
            //console.log("xaxis "+d);
            //return d3.time.format("%X")(new Date(d.time));
            return d3.format(',f')(d);
          }
        },
        x2Axis: {
          tickFormat: function(d){
            //console.log("x2axis "+d);
            //return d.time;
            return d3.format(',f')(d);
          }
        },
        yAxis: {
          axisLabel: 'Y Axis',
          tickFormat: function(d){
            //console.log("yaxis "+d);
            //return d.data;
            return d3.format(',.2f')(d);
          },
          rotateYLabel: false
        },
        y2Axis: {
          tickFormat: function(d){
            //console.log("y2axis "+d);
            //return d.data;
            return d3.format(',.2f')(d);
          }
        }
      }
    };
    $scope.data = [{
      key: "Key",
      values: [
        {
          "pkt_id": 24,
          "priority": 7,
          "MSG_type": 0,
          "time": "2014-12-20T10:36:41",
          "node": 50,
          "channel": 3,
          "data": 9
        },
        {
          "pkt_id": 25,
          "priority": 7,
          "MSG_type": 0,
          "time": "2014-12-20T11:36:41",
          "node": 50,
          "channel": 3,
          "data": 8
        },
        {
          "pkt_id": 26,
          "priority": 7,
          "MSG_type": 0,
          "time": "2014-12-20T12:36:41",
          "node": 50,
          "channel": 3,
          "data": 7
        },
        {
          "pkt_id": 27,
          "priority": 7,
          "MSG_type": 0,
          "time": "2014-12-20T13:36:41",
          "node": 50,
          "channel": 3,
          "data": 6
        },
        {
          "pkt_id": 28,
          "priority": 7,
          "MSG_type": 0,
          "time": "2014-12-20T14:36:41",
          "node": 50,
          "channel": 3,
          "data": 5
        }
      ]
    }];
        $scope.data = generateData();

        /* Random Data Generator (took from nvd3.org) */
        function generateData() {
            var x = stream_layers(3,10+Math.random()*200,.1).map(function(data, i) {
                return {
                    key: 'Stream' + i,
                    values: data
                };
            });
            console.log(x);
            return x;
        }

        /* Inspired by Lee Byron's test data generator. */
        function stream_layers(n, m, o) {
            if (arguments.length < 3) o = 0;
            function bump(a) {
                var x = 1 / (.1 + Math.random()),
                    y = 2 * Math.random() - .5,
                    z = 10 / (.1 + Math.random());
                for (var i = 0; i < m; i++) {
                    var w = (i / m - y) * z;
                    a[i] += x * Math.exp(-w * w);
                }
            }
            return d3.range(n).map(function() {
                var a = [], i;
                for (i = 0; i < m; i++) a[i] = o + o * Math.random();
                for (i = 0; i < 5; i++) bump(a);
                return a.map(stream_index);
            });
        }

        /* Another layer generator using gamma distributions. */
        function stream_waves(n, m) {
            return d3.range(n).map(function(i) {
                return d3.range(m).map(function(j) {
                    var x = 20 * j / m - i / 3;
                    return 2 * x * Math.exp(-.5 * x);
                }).map(stream_index);
            });
        }

        function stream_index(d, i) {
            return {x: i, y: Math.max(0, d)};
        }
  })();
}]);

/*
 * controller used to handle node and channel selection
 */
app.controller("selectionCtrl", ["$scope", "$http", "$interval", "_data",
    function($scope, $http, $interval, _data) {
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
      $scope.getChannels();
    } else {
      _data.currState.channel = value;
    }
  };
  $scope.getNodes = function() {
    //attempt to get all nodes
    var url = "/example_nodes.json";
    //var url = "/nodes";
    _data.getData(url).then(function(nodes) {
      $scope.nodes = nodes;
      //clear selections and cached channels on node refresh
      _data.currState.node = "";
      _data.currState.channel = "";
      $scope.channels = "";
    });
  };
  $scope.getChannels = function() {
    var url = "/nodes/"+_data.currState.node.node+"/example_channels.json";
    //var url = "/node/"+_data.currState.node.node+"/channels";
    _data.getData(url).
        then(function(channels) {
      $scope.channels = channels;
    });
  };
  //init
  (function() {
    $scope.getNodes();
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

