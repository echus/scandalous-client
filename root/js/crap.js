app.factory("_format", function() {
    return {
        /**
         * Given a date in dateTime format, returns the time in 24hr format
         * @param dateTime dateTime string YYYY-MM-DDTHH:mm:ss
         * @return time in the format HH:mm:ss
         */
        formatTime: function(dateTime) {
            var parsedDate = new Date(dateTime)
            return addPadding(parsedDate.getHours())+":"+
                addPadding(parsedDate.getMinutes())+"."+
                addPadding(parsedDate.getSeconds())
        },
        /**
         * prefix numbers in the range [0, 9] with "0"
         * @param x number to be formatted
         * @return number as a string
         */
        addPadding: function(x) {
            if (x < 10 && x >= 0) {
                return "0" + x
            } else {
                return x
            }
        },
        /**
         * Get unit for channel reading
         * @param channel the channel name i.e. channel.value
         * @return unit as a string
         */
        getUnit: function(channel) {
            if (channel.search(/current/i) !== -1) {
                return "A"
            } else if (channel.search(/voltage/i) !== -1) {
                return "V"
            } else if (channel.search(/power/i) !== -1) {
                return "W"
            } else {
                return ""
            }
        },
    }
})

app.factory("_chart", function(_format) {
    return {
        /**
         * render chart redraws the whole chart.
         * used when columns need to be redrawn due to changes to selected
         * channels or during initialization
         * @param columns the axes and data to be plotted x, y1, y2
         * @return the chart that can be attached to the view
         */
        renderChart: function(columns) {
            var axes = {}
            var axis = {
                x: {
                    label: "Time",
                    tick: {
                        //show time as HH:mm:ss
                        format: function(x) {
                            return _format.formatTime(x)
                        },
                    }
                }
            }
            var labels = ['y', 'y2']
            for (var i = 1; i < columns.length; ++i) {
                //bind data to corresponding axes
                axes[columns[i][0]] = labels[i - 1]
                //label and show axes appropriately
                axis[labels[i - 1]] = {label: columns[i][0], show: true}
            }
            console.log(axes)
            return {
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
            }
        },

    }
})

app.factory("_data", function() {
    return {
        data: [],
        limit: 50,
        /**
         * Get packets based on node and channel selected from backend,
         * remove duplicates based on time per channel.
         * @param node the node.node selected
         * @param channels list of channel.channel values selected
         * @return list of lists of channel data partitioned by channel ordered
         *      by descending time
         */
        getData: function(node, channel) {
            var parsedPackets = [];
            var url = "packets?node="+node+"&limit="+this.limit*10
            _backend.getData(url).then(function(allPackets) {
                for (var i = 0; i < channels.length; ++i) {
                    //filter packets by channel and
                    //remove duplicates based on time
                    var currPacketTime = ""
                    var packets = allPackets.filter(function(element) {
                        if (channels[i] === element.channel &&
                                currPacketTime !== element.time) {
                            currPacketTime = element.time
                            return true
                        } else {
                            return false
                        }
                    })
                    parsedPackets.push(packets);
                }
            })
            return parsedPackets;
        },

    }
})
