(function() {
  var app = angular.module("myApp", []);
  
  app.factory("_data", function($http) {
    return {
      //default domain of scandalous backend
      domain: "127.1.1.1",
      //default port of scadalous backend
      port: "8000",
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
    var valueTask;
    //start process of retrieving channel values
    var init = function() {
      //don't start new task if already started
      if (angular.isDefined(valueTask)) return;

      //start task to get realtime value every second
      valueTask = $interval(function() {
        //check if node and channel have been selected and only attempt
        //to retrieve value if both are selected
        if (_data.currState.node === "" || _data.currState.channel === "") {
          console.error("node or channel not selected");
        } else {
          var url = "http://"+_data.domain+":"+_data.port+"/nodes/"+_data.currState.node+"/channel/"+_data.currState.channel+".json";
          //TODO change to this url for production
          //var url = "http://" + _data.domain + ":" + _data.port + "?node=" +
          //    _data.currState.node + "&ch=" + _data.currState.channel;
          console.log("valueCtrl request: " + url);
          $http.get(url).
            //on successful GET update _data.value and $scope.value and
            //reset _data.currState.hearbeat incase it was incremented
            //previously due to packet loss(es)
            success(function(data, status) {
              console.log(status);
              console.log(data);
              _data.currState.heartbeat = 0;
              //set live channel reading
              $scope.value = data[data.length - 1].data;
              $scope.timestamp = data[data.length - 1].time;
              //set graph TODO
              $scope.values = data;
            }).
            //on unsuccessful GET, increment heartbeat and replace
            //_data.currState.value and $scope.value with an error message
            //if heartbeat limit is reached
            error(function(data, status) {
              console.log(status);
              console.log(data);
              ++_data.currState.heartbeat;
              if (_data.currState.heartbeat > _data.heartbeatLimit - 1) {
                $scope.value = "Scandalous has been unreachable for " +
                    _data.currState.heartbeat + "s";
              }
            });
        }
      }, 1000);
    };
    init();
  }]);

  /*
   * controller used to handle node and channel selection
   */
  app.controller("selectionCtrl", ["$scope", "$http", "$interval", "_data",
      function($scope, $http, $interval, _data) {
    //returns true if node is selected, false otherwise
    $scope.isSelected = function(isNode, value) {
      if (isNode) {
        return _data.currState.node === value;
      } else {
        return _data.currState.channel === value;
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
      _data.getData("/example_nodes.json").then(function(nodes) {
        $scope.nodes = nodes;
      });
    };
    $scope.getChannels = function() {
      _data.getData("/nodes/"+_data.currState.node+"/example_channels.json").
          then(function(channels) {
        $scope.channels = channels;
      });
    };
    var init = function() {
      $scope.getNodes();
    };
    init();
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

})();
