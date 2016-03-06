var GitHubApi = require('github');
var removeMd = require('remove-markdown');
var fs = require('fs');
var async = require('async');

var github = new GitHubApi({
    version: '3.0.0',
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    headers: {
        'user-agent': 'webdev-task-1-app'
    }
});

function readKey(mainCb, cb) {
    var rs = fs.createReadStream('key.txt');
    var string = '';
    rs.on('data', function(buffer){
        var part = buffer.toString();
        string += part;
        //console.log('Streamed data ' + part);
    });
    rs.on('end', function () {
        //console.log('Final ' + string);
        cb(null, string, mainCb);
    });
}

function githubAuth(key, mainCb, cb) {
    github.authenticate({
        type: 'oauth',
        token: key.replace(/\n$/, '')
    });
    cb(null, mainCb);
}

function getAllTasksReadme(arg, mainCb) {
    async.waterfall([
        async.apply(readKey, mainCb),
        githubAuth
    ], function (err, mainCb) {
        github.repos.getFromOrg({
            org: 'urfu-2015'
        }, function(err, repores) {
            // Анализ только readme задач первого семестра
            var re = new RegExp(".*task.*");
            var text = '';
            async.forEach(repores, function (item, callback) {
                var repoName = item['name'];
                if (repoName.search(re) != -1) {
                    github.repos.getReadme({
                        user: 'urfu-2015',
                        repo: repoName
                    }, function(err, res) {
                        text += removeMd(new Buffer(res.content, 'base64').toString('utf-8'));
                        callback();
                    });
                } else {
                    callback();
                }
            }, function () {
                mainCb(err, text);
            });
        });
    });
}

//getAllTasksReadme(console.log);
module.exports.getAllTasksReadme = getAllTasksReadme;
