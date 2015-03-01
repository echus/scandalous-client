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
app.get("/packets", function(req, res) {
  //var parsedUrl = url.parse(req.url, true, true);
  //res.send(parsedUrl);
  var packets = [];
  var samples = 50;
  var timeOffset = new Date().getTimezoneOffset()*60000;
  var today = new Date().valueOf() - samples * 1000 - timeOffset;
  for (var i = samples - 1; i >= 0; --i) {
    var date = new Date(today + i * 1000).toISOString();
    date = date.substring(0, 19);
    packets[i] = {
      time: date,
      data: Math.random() * 100
    }
  }
  console.log();
  console.log(packets);
  console.log();
  res.send(packets);
});

var server = app.listen(process.argv[3], process.argv[2]);
