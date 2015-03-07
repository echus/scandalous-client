var express = require("express");
var app = express();
var fs = require("fs");
var url = require("url");

if (process.argv.length !== 6) {
  process.stderr.write(
      "Usage: <domain> <port> <nodes> <channels>\n");
  process.exit(1);
}

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});
app.get("/nodes", function(req, res) {
  res.send(fs.readFileSync(process.argv[4], {encoding:"utf8"}));
});
app.get("/node/[0-9]+/channels", function(req, res) {
  res.send(fs.readFileSync(process.argv[5], {encoding:"utf8"}));
});
var timeOffset = new Date().getTimezoneOffset()*60000;
var packets = [];
setInterval(function() {
  var currTime = new Date().valueOf();
  //if (packets.length === 5) return;
  packets.unshift({
    time: new Date(currTime - timeOffset).toISOString().substring(0, 19),
    data: parseFloat((Math.random() * 100).toFixed(2))
  })
}, 500);
app.get("/packets", function(req, res) {
  /*
  var currTime = new Date().valueOf();
  for (var i = currTime; i >= startTime; i -= 1000) {
    packets.push({
      time: new Date(i - timeOffset).toISOString().substring(0, 19),
      data: parseFloat((Math.random() * 100).toFixed(2))
    })
    startTime = currTime;
  }*/

  /*
  //var parsedUrl = url.parse(req.url, true, true);
  //res.send(parsedUrl);
  var packets = [];
  var samples = 50;
  for (var i = 0; i < samples; ++i) {
    var date = new Date(today + i * 1000).toISOString();
    date = date.substring(0, 19);
    packets[samples - 1 - i] = {
      time: date,
      data: Math.random() * 100
    }
  }
  */
  console.log();
  console.log(packets);
  console.log();
  res.send(packets);
});

var server = app.listen(process.argv[3], process.argv[2]);
