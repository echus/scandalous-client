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
app.controller("valuesCtrl", ["$scope", "$http", "$interval", "_data",
    function($scope, $http, $interval, _data) {
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
            value : values[values.length - 1].data,
            unit : $scope.getUnit()
          };

          $scope.timestamp = {
            value : values[values.length - 1].time,
            style : "text-center"
          };
          setChart(values);
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
    $scope.data[0].key = _data.currState.node.device;
    var values = [];
    var timeOffset = new Date().getTimezoneOffset() * 60000;
    for (var i = 0; i < packets.length; ++i) {
      console.log("data: "+packets[i].data);
      var parsedTime = new Date(packets[i].time);
      values.push({
        x: parsedTime.getTime() + timeOffset,
        y: packets[i].data
      });
    }
    $scope.data[0].values = values;
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
          axisLabel: 'Time',
          tickFormat: function(d){
            return d3.time.format("%X")(new Date(d));
          }
        },
        x2Axis: {
          tickFormat: function(d){
            return d3.time.format("%X")(new Date(d));
          }
        },
        yAxis: {
          axisLabel: $scope.getUnit(),
          tickFormat: function(d){
            return d3.format(',.2f')(d);
          },
          rotateYLabel: false
        },
        y2Axis: {
          tickFormat: function(d){
            return d3.format(',.2f')(d);
          }
        }
      }
    };
  $scope.data = [{
    key: _data.currState.node.device,
    values: [
        {
          x: 1136005200000,
          y: 12
        },
        {
          x: 1138683600000,
          y: 11
        },  
        {
          x: 1141102800000,
          y: 10
        },  
        {
          x: 1143781200000,
          y: 9
        },  
        {   
          x: 1146369600000,
          y: 8
        },  
        {   
          x: 1149048000000,
          y: 7
        },  
        {   
          x: 1151640000000,
          y: 6
        },  
        {   
          x: 1154318400000,
          y: 5
        }   
    ]   
  }];
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

