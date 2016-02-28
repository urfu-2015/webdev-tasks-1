var fs = require('fs');
var key = fs.readFileSync('key.txt', 'utf-8').slice(0, -1);

var jsPattern = 'javascript-tasks-';
var htmlPattern = 'verstka-tasks-';
var repos = [];
for (var i = 1; i <= 10; i++) {
    repos.push(jsPattern + i.toLocaleString());
    repos.push(htmlPattern + i.toLocaleString());
}

module.exports.repos = repos;
module.exports.repoPath = 'https://api.github.com/repos/urfu-2015/';
module.exports.token = key;
