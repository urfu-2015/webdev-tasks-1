var GitHubApi = require('github');
var removeMd = require('remove-markdown');
var fs = require('fs');

var github = new GitHubApi({
    version: '3.0.0',
    debug: false,
    protocol: 'https',
    host: 'api.github.com',
    headers: {
        'user-agent': 'webdev-task-1-app'
    }
});

// Читаем синхронно, так как все равно без авторизации никуда
github.authenticate({
   type: 'oauth',
    token: fs.readFileSync('key.txt', 'utf8').replace(/\n$/, '')
});

function getAllTasksReadme(cb) {
    github.repos.getFromOrg({
        org: 'urfu-2015'
    }, function(err, repores) {
        // Анализ только readme задач первого семестра
        var re = new RegExp(".*task.*");
        var text = '';
        var count = 0;
        var tasksRepoCount = 0;
        for (var i = 0; i < repores.length; ++i) {
            var repoName = repores[i]['name'];
            if (repoName.search(re) != -1) {
                tasksRepoCount++;
                github.repos.getReadme({
                    user: 'urfu-2015',
                    repo: repoName
                }, function(err, res) {
                    var readme = removeMd(new Buffer(res.content, 'base64').toString('utf-8'));
                    text += readme;
                    count++;
                    if (count === tasksRepoCount) {
                        cb(text);
                    }
                });
            }
        }
    });
}

//getAllTasksReadme(function(res){console.log(res)});
module.exports.getAllTasksReadme = getAllTasksReadme;
