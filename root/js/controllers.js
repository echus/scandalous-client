
var controllers = angular.module('integrator.controllers', []);


controllers.controller('IntegratorController', ['$scope', '$http', function($scope, $http){

    // Fetch the available tracks on the server
    $http.get('/modeller/races/list').
        success(function(jsonIn){
            $scope.raceData = jsonIn;
            $scope.race = jsonIn[0];
        }).error(function(){
            $scope.raceData = ['Failed to fetch track data from server'];
            alert('Failed to fetch track data from server');
        });

    // Fetch the available environment models on the
    $http.get('/modeller/environments/list').
        success(function(jsonIn){
            $scope.environmentData = jsonIn;
        }).
        error(function(){
            $scope.environmentData = ['Failed to fetch environment data from server'];
            alert('Failed to fetch environment data from server');
        });

    // Initialize total charge summary graph
    // Data will be passed directly into c3 generate function
    $scope.totalCharge = {};
    $scope.totalCharge.data = {
        type: 'line',
        x: 'x',
        columns: [
            ['x', 0],
            ['data1', 0],
            ['data2', 0]
        ]
    };
    $scope.totalCharge.axis = {
        y: {
            label: "Battery charge (kWh)",
            tick: {
                // Format output as kilowatt hours with 2dp
                format: function(y){
                    var kilowatthrs = y/3600000
                    return kilowatthrs.toFixed(2)
                }
            }
        },
        y2: {
            label: "Power (W)",
            show: true,
            // Format output as watts with 1dp
            tick: {
                format: function(y){
                    return y.toFixed(1)
                }
            }
        },
        x: {
            tick: {
                format: function(x){
                    var date = new Date(0); // Set to epoch
                    date.setUTCSeconds(x)
                    var dateString = date.toUTCString()
                    console.log('1')
                    return dateString;
                },
                culling: {
                    max: 5
                }
            }
        }
    };
    $scope.totalCharge.subchart = {
        show: true
    };

    // Initialize power breakdown graph
    // Data will be passed directly into c3 generate function
    $scope.powerBreakdown = {};
    $scope.powerBreakdown.data = {
        type: 'line',
        x: 'x',
        columns: [
            ['x', 0],
            ['data1', 0],
            ['data2', 0]
        ]
    };
    $scope.powerBreakdown.axis = {
        y: {
            label: "Power (W)",
            show: true,
            // Format output as watts with 1dp
            tick: {
                format: function(y){
                    return y.toFixed(1)
                }
            }
        },
        x: {
            tick: {
                format: function(x){
                    var date = new Date(0); // Set to epoch
                    date.setUTCSeconds(x)
                    var dateString = date.toUTCString()
                    console.log('1')
                    return dateString;
                },
                culling: {
                    max: 5
                }
            }
        }
    };
    $scope.powerBreakdown.subchart = {
        show: true
    };





    // Initialize sliders
    // Track slider
    $scope.track = {};
    $scope.track.posMin = 0;
    $scope.track.posMax = 100;
    $scope.track.posStart = 0;
    $scope.track.posEnd = 100;

    // Environment setup and time slider
    $scope.env = {};
    $scope.env.timeStart = 0;
    $scope.env.timeFinish = 100;
    $scope.env.timeMin = 0;
    $scope.env.timeMax = 100;
    $scope.env.date = new Date(2015,10,20,0,0,0,0);


    // Updates the graph using AJAX.
    $scope.updateGraph = function(){
        // Send AJAX request for the graph axis data
        $http.post('modeller/strategiser', {
            race: $scope.race,
            start_seg: 0,
            end_seg: 5,
            start_dist: 0,
            end_dist: 10000000,
            environment: "" + $scope.environment,
            battery: 5.4e7
        }).
        success(function(jsonIn){
            var time = ['x'];
            var solar = ['solar'];      // Solar output
            var battery= ['battery'];   // Battery charge

            // Build graph data in c3 format
            for(var i = 0; i < jsonIn.segments.length; i++){
                var currSeg = jsonIn.segments[i];
                time = time.concat(currSeg.timeseries);
                solar = solar.concat(currSeg.solar_output);
                battery = battery.concat(currSeg.batt_charge);
            }

            $scope.totalCharge.data = {
                columns: [
                    time,
                    solar,
                    battery
                ],
                axes: {
                    battery: 'y',
                    solar: 'y2'
                },
                unload: true,
                names: {
                    solar: 'Solar panel output (W)',
                    battery: 'Battery charge (kWh)'
                }
            };

            console.log($scope)

        }).
        error(function(){
            alert('Failed to fetch graph data from server')
        });
    }

}]);
