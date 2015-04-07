var app = angular.module("myApp", ["openlayers-directive"]);

app.factory("_data", function() {
  return {
    //default domain of scandalous backend
    domain: "localhost",
    //default port of scadalous backend
    port: "80/backend",
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
    });
  };
  //set selected node as active then query server for channels
  //limit the number of active nodes to 1. The only time there is no
  //active node is at start up
  $scope.toggleNodes = function(node) {
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
    });
  };
  //set active channel as inactive, vice versa, then refresh chart to
  //plot new data that corresponds to change in active channels
  $scope.toggleChannels = function(channel) {
    var activeChannels = getActiveChannels();
    //allow max of 2 selected channels
    if (activeChannels.length === 2) {
      for (var i = 0; i < activeChannels.length; ++i) {
        if (activeChannels[i].channel === channel.channel) {
          activeChannels[i].isActive = !channel.isActive;
          console.log(activeChannels[i].channel);
        }
      }
    } else {
      for (var i = 0; i < $scope.channels.length; ++i) {
        if ($scope.channels[i].channel === channel.channel) {
          $scope.channels[i].isActive = !$scope.channels[i].isActive;
        }
      }
    }
    refreshChart();
  }
  /**
   * render chart used when there are changes to selected channels to be drawn
   * or during initialization
   * @param columns the data to be plotted
   */
  function renderChart(columns) {
    var axes = {};
    var axis = {
      x: {
        label: "Time",
        tick: {
          //show time as HH:mm:ss
          format: function(x) {
            return $scope.parseTime(x);
          },
        }
      }
    };
    var labels = ['y', 'y2'];
    for (var i = 1; i < columns.length; ++i) {
      //bind data to corresponding axes
      axes[columns[i][0]] = labels[i - 1];
      //label and show axes appropriately
      axis[labels[i - 1]] = {label: columns[i][0], show: true};
    }
    $scope.chart = {
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
    };
  }
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
    renderChart(columns);
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
      var url = "packets?node="+getActiveNode().node+"&limit="+$scope.limit*50;
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
    $scope.getFormChannels = function() {
        var url = "nodes/"+$scope.form.node.node+"/channels"
        getData(url).then(function(channels) {
            $scope.form.channels = channels
        })
    }
    /**
     * send data to backend
     */
    $scope.sendData = function() {
        if (typeof $scope.form.node === "undefined") {
            $scope.form.feedback = "Node not selected"
        } else if (typeof $scope.form.channel === "undefined") {
            $scope.form.feedback = "Channel not selected"
        } else if (typeof $scope.form.data === "undefined") {
            $scope.form.feedback = "Data not entered"
        } else {
            var url = "http://"+_data.domain+":"+_data.port+"/packets/outbound"
            var msg = {
                node: $scope.form.node,
                channel: $scope.form.channel,
                data: $scope.form.data,
                msg_type: "I DON'T KNOW WHAT TO DO WITH YOU"
            }
            $http.post(url, msg).
                success(function(data, status) {
                    if (status === 200) {
                        $scope.form.feedback = data
                    } else if (status === 400) {
                        $scope.form.feedback = data.error
                    }
                }).
                error(function(data, status) {
                    $scope.form.feedback = status+" "+data
                })
        }

    }
    function renderMap() {
        angular.extend($scope, {
            center: {
                lat: 51.505,
                lon: -0.09,
                zoom: 8,
                autodiscover: true
            },
            defaults: {
                interactions: {
                    mouseWheelZoom: true
                },
                controls: {
                    zoom: false,
                    rotate: false,
                    attribution: false 
                }
            }
        })
    }
  //init
  function init() {
    //initial max limit of data points on chart
    $scope.limit = 50;
    //get all nodes
    $scope.getNodes();
    //start task to get realtime value every second
    $interval(getValues, 1000);
    //init chart
    renderChart([["x", 0, 1000, 2000],["data", 50, 100, 50],["data2", 0, 1, 2]]);
    //create form object to hold form values
    $scope.form = {};
    //init map
    renderMap();
  }
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
