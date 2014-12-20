(function() {
  var app = angular.module("myApp", []);
  
  app.factory("_data", function() {
    return {
      //default domain of scandalous backend
      domain: "127.1.1.1",
      //default port of scadalous backend
      port: "8000",
      //all available nodes
      nodes: [
        {name: "DRIVER CONTROL TELEM", value: "10"},
        {name: "SMARTDCDC", value: "20"},
        {name: "BMS LOWER", value: "30"},
        {name: "BMS HIGHER", value: "31"},
        {name: "MPPT READ", value: "40"},
        {name: "MPPT FRONT", value: "41"},
        {name: "CURRENT INTEGRATOR", value: "50"},
        {name: "DRIVER DISPLAY", value: "60"},
        {name: "GPS", value: "70"},
        {name: "SWITCHCARD REAR", value: "80"},
        {name: "SWITCHCARD FRONT", value: "81"}
      ],
      //all available channels
      channels: [
        {name: "CURRENT", value: "0"},
        {name: "VOLTAGE", value: "1"},
        {name: "POWER", value: "2"},
        {name: "INTEGRATED CURRENT", value: "3"},
        {name: "INTEGRATED POWER", value: "4"},
        {name: "SAMPLES", value: "5"},
        {name: "RESET INTEGRATION", value: "6"}
      ],
      currState: {
        node: "", //current node selected
        channel: "", //current channel selected
        value: "", //current value from curr node & channel
      }
    };
  });
  //controller to handle interactive graph
  app.controller("graphCtrl", ["$log", "$scope", "_data",
      function($log, $scope, _data) {
      //TODO
  }]);
  //controller to handle current channel value
  app.controller("valueCtrl", ["$log", "$scope", "$http", "$interval", "_data",
      function($log, $scope, $http, $interval, _data) {
    $scope.value = _data.currState.value;
    var valueTask;
    //start process of retrieving channel values
    var init = function() {
      //don't start new task if already started
      if (angular.isDefined(valueTask)) return;

      //start task to call getValue every second
      valueTask = $interval(function() {
        //get current channel value
        var request = _data.domain + ":" + _data.port + "?node=" +
            _data.currState.node + "&ch=" + _data.currState.channel;
        var response = "";
        /*
        $http.get().success(function(response) {
          $scope.nodes = response;
        });*/
        $log.log("request:" + request + "\tresponse:" + response);
        _data.currState.value = request;//TODO change to response
        $scope.value = _data.currState.value;
      }, 1000);
    };
    init();
  }]);
  //controller to handle channel selection
  app.controller("channelCtrl", ["$log", "$scope", "$interval", "_data",
      function($log, $scope, $interval, _data) {
    $scope.channels = _data.channels;
    //returns true if channel is selected, false otherwise
    $scope.isSelected = function(channel) {
      return _data.currState.channel === channel;
    };
    //sets current channel in _data to the given channel
    $scope.setSelected = function(channel) {
      _data.currState.channel = channel;
      $log.log("selected channel: " + _data.currState.channel);
    };
    var channelTask;
    var init = function() {
      //don't start new task if already started
      if (angular.isDefined(channelTask)) return;

      //start task to get nodes every second
      channelTask = $interval(function() {
        var url = _data.domain + ":" + _data.port + "/nodes/" +
            _data.currState.channel + "/channel";
        $log.log(url);
      }, 1000);
    };
    init();
  }]);

  //controller to handle node selection
  app.controller("nodeCtrl", ["$log", "$scope", "$http", "$interval", "_data",
      function($log, $scope, $http, $interval, _data) {
    $scope.nodes = _data.nodes;
    //returns true if node is selected, false otherwise
    $scope.isSelected = function(node) {
      return _data.currState.node === node;
    };
    //sets current node in _data to the given node
    $scope.setSelected = function(node) {
      _data.currState.node = node;
      $log.log("selected node: " + _data.currState.node);
    };
    var nodeTask;
    var init = function() {
      //don't start new task if already started
      if (angular.isDefined(nodeTask)) return;

      //start task to get nodes every second
      nodeTask = $interval(function() {
        var url = _data.domain + ":" + _data.port + "/nodes";
        $log.log(url);
      }, 1000);
    };
    init();
  }]);

  //controller to set/get domain of scandalous backend
  app.controller("domainCtrl", ["$log", "$scope", "_data",
      function($log, $scope, _data) {
    $scope.domain = _data.domain;
    //sets domain of backend in _data to given domain
    $scope.setDomain = function(domain) {
      _data.domain = domain;
      $log.log("domain changed to " + _data.domain);
    };
  }]);

  //controller to get/set port of scandalous backend
  app.controller("portCtrl", ["$log", "$scope", "_data",
      function($log, $scope, _data) {
    $scope.port = _data.port;
    //sets port of backend in _data to given port
    $scope.setPort = function(port) {
      _data.port = port;
      $log.log("port changed to " + _data.port);
    };
  }]);

})();
