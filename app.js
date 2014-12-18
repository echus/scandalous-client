(function() {
  var app = angular.module("myApp", []);
  
  app.factory("data", function() {
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
  //controller to handle current channel value
  app.controller("valueCtrl", ["$log", "$scope", "$http", "data", function($log, $scope, $http, data) {
    $scope.value = data.currState.value;
    //get current channel value
    $scope.getValue = function() {
      var request = data.domain + ":" + data.port + "?node=" +
          data.currState.node + "&ch=" + data.currState.channel;
      var response = "";
      /*
      $http.get().success(function(response) {
        $scope.nodes = response;
      });*/
      $log.log("request:" + request + "\tresponse:" + response);
      return "500W";
    };
  }]);
  //controller to handle channel selection
  app.controller("channelCtrl", ["$log", "$scope", "data", function($log, $scope, data) {
    $scope.channels = data.channels;
    //returns true if channel is selected, false otherwise
    $scope.isSelected = function(channel) {
      return data.currState.channel === channel;
    };
    //sets current channel in data to the given channel
    $scope.setSelected = function(channel) {
      data.currState.channel = channel;
      $log.log("selected channel: " + data.currState.channel);
    };
  }]);

  //controller to handle node selection
  app.controller("nodeCtrl", ["$log", "$scope", "$http", "data", function($log, $scope, $http, data) {
    $scope.nodes = data.nodes;
    //returns true if node is selected, false otherwise
    $scope.isSelected = function(node) {
      return data.currState.node === node;
    };
    //sets current node in data to the given node
    $scope.setSelected = function(node) {
      data.currState.node = node;
      $log.log("selected node: " + data.currState.node);
    };
    /*
    $scope.getNodes = function() {
      $http.get(data.domain + "/packets" + ".html").success(function(response) {
        $scope.nodes = response;
      });
      return data.domain + "/packets";
    };
    */
  }]);

  //controller to set/get domain of scandalous backend
  app.controller("domainCtrl", ["$log", "$scope", "data", function($log, $scope, data) {
    $scope.domain = data.domain;
    //sets domain of backend in data to given domain
    $scope.setDomain = function(domain) {
      data.domain = domain;
      $log.log("domain changed to " + data.domain);
    };
  }]);

  //controller to get/set port of scandalous backend
  app.controller("portCtrl", ["$log", "$scope", "data", function($log, $scope, data) {
    $scope.port = data.port;
    //sets port of backend in data to given port
    $scope.setPort = function(port) {
      data.port = port;
      $log.log("port changed to " + data.port);
    };
  }]);

})();
