var fs = require('fs');
var async = require('async');
var natural = require('natural');
var GitHubApi = require('github');
var stopWords = require('./stopWords.js');

function getGitHubApi(callback) {
    callback(null, new GitHubApi({
        version: '3.0.0',
        protocol: 'https',
        host: 'api.github.com',
        timeout: 5000,
        headers: {
            'user-agent': 'webdev-tasks-1'
        }
    }));
}

function getAuthenticate(github, callback) {
    var token = fs.readFileSync('./key.txt', 'utf-8');
    github.authenticate({
        type: 'token',
        token: token
    });
    callback(null, github);
}

function getRepoReadme(github, callback) {
    var text = '';
    github.repos.getFromOrg({
        org: 'urfu-2015'
    }, function (error, repos) {
        async.each(repos, function (repo, callback) {
            var repoName = repo['name'];
            if (repoName.indexOf('task') >= 0) {
                github.repos.getReadme({
                        user: 'urfu-2015',
                        repo: repoName
                    }, function (error, data) {
                        text += new Buffer(data.content, 'base64').toString('utf-8');
                        callback();
                    }
                );
            } else {
                callback();
            }
        }, function () {
            callback(null, text);
        });
    });
}

function getRootsHash(text, callback) {
    var words = text.toLowerCase()
        .replace(/[^а-яё]/g, ' ')
        .replace(/\s+/g, ' ')
        .split(' ')
        .filter(function (item) {
            return (stopWords.indexOf(item) < 0);
        });
    var roots = {};
    words.forEach(function (item, index, iterate) {
        var root = natural.PorterStemmerRu.stem(item);
        if (!roots[root]) {
            roots[root] = {
                example: item,
                counter: 1
            };
        } else {
            ++roots[root].counter;
        }
    });
    callback(null, roots);
}

function count(word, hash, callback) {
    var root = natural.PorterStemmerRu.stem(word);
    if (!hash[root]) {
        callback(null, word + ' 0');
    } else {
        callback(null, word + ' ' + hash[root].counter);
    }
}

function top(count, hash, callback) {
    var keys = Object.keys(hash);
    keys.sort(function (a, b) {
        return hash[b].counter - hash[a].counter;
    });
    for (var i = 0; i < count; ++i) {
        callback(null, hash[keys[i]].example + ' ' + hash[keys[i]].counter);
    }
}

function worker(params, callback) {
    async.waterfall([
        getGitHubApi,
        getAuthenticate,
        getRepoReadme,
        getRootsHash
    ], function (error, hash) {
        if (params[1] === 'count') {
            count(params[0], hash, callback);
        }
        if (params[1] === 'top') {
            top(params[0], hash, callback);
        }
    });
}

module.exports.count = function (word) {
    worker([word, 'count'], function (error, data) {
        console.log(data);
    });
};

module.exports.top = function (count) {
    worker([count, 'top'], function (error, data) {
        console.log(data);
    });
};

module.exports.top(10);
