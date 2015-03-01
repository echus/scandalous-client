
var integrator = angular.module('myApp');

// Directive for creating a c3 xy chart
//
integrator.directive('xychart', function(){
    return {
        restrict: 'AE',
        require: 'ngModel',
        scope: {
            ngModel: '=ngModel'
        },
        link: function (scope, elem, attr, ngModel) {
            var chart;
            // Initialize the chart, only fires once
            scope.$watch(function(){
                // Check if modelValue is NaN, NaN is not equal to itself
                return ngModel.$modelValue == ngModel.$modelValue;
            }, function(){
                if(ngModel.$modelValue != ngModel.$modelValue) return;
                var params = ngModel.$modelValue;
                params.bindto = "#" + attr.id;
                chart = c3.generate(params)
            });

            // Update rows, cols, axes
            // Update the graph data using the c3 load api
            // http://c3js.org/reference.html#api-load
            scope.$watch(function(){
                return ngModel.$modelValue.data;
            }, function(){
                if(chart === undefined) return;
                chart.load(ngModel.$modelValue.data);
                // Names must be handled separately
                if(ngModel.$modelValue.data.names){
                    chart.data.names(ngModel.$modelValue.data.names);
                }
            });


            // Update axis formatting
            // Cannot be updated on existing chart, new chart must
            // be made.
            scope.$watch(function(){
                return ngModel.$modelValue.axis
            }, function(){
                if(chart === undefined) return;
                var params = ngModel.$modelValue;
                params.bindto = "#" + attr.id;
                chart = c3.generate(params)
            });

        }

    }
});
