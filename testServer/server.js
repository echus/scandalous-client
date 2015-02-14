"use strict";
if (process.argv.length !== 7) {
  process.stderr.write("Usage: <domain> <port> <nodes> <channels> <index.html>\n");
  process.exit(1);
}
var http = require("http");
var url = require("url");
var server = http.createServer(function(req, res) {
    if (req.method === "GET") {
      res.writeHead(200, {"Content-Type":"text/html"});
      var parsedUrl = url.parse(req.url, true, true);
      console.log(parsedUrl);
      //no query nor pathname, return index.html
      if (parsedUrl.path === "/") {
        res.write(getUI());
      //no query, request for nodes or channels
      } else if (parsedUrl.search === "") {
        var parsedPath = parsedUrl.path.split("/");
        //request for nodes
        if (parsedPath.length < 4) {
          console.log(getNodes());
          res.write(getNodes());
        //request for channels
        } else {
          res.write(getChannels(parsedPath[2]));
        }
      //pathname and query present, request for data packets
      } else {
        
      }
    } else {
      res.statusCode = 404;
    }
    res.end();
});
var fs = require("fs");
function getUI() {
  return fs.readFileSync(process.argv[6], {encoding:"utf8"});
}
function getNodes() {
  return fs.readFileSync(process.argv[4], {encoding:"utf8"});
}
function getChannels(node) {
  return fs.readFileSync(process.argv[5], {encoding:"utf8"});
}
server.listen(process.argv[3], process.argv[2]);
