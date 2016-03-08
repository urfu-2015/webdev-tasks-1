var fs = require('fs');
var async = require('async');
var natural = require('natural');
var GitHubApi = require('github');
var stopWords = require('./stopWords.json');

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

function getAllReadme(github, repos, callback) {
    var text = '';
    var latestDate = new Date(2016, 0, 1);
    async.each(repos, function (repo, callback) {
        var repoName = repo['name'];
        var createDate = new Date(repo['created_at']);
        if (repoName.indexOf('task') >= 0 &&
            createDate < latestDate) {
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
}

function getRepoReadme(github, callback) {
    github.repos.getFromOrg({
        org: 'urfu-2015'
    }, function (error, repos) {
        getAllReadme(github, repos, callback);
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
    words.forEach(function (item) {
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
    word = word.toString();
    var root = natural.PorterStemmerRu.stem(word);
    var counter = hash[root] ? hash[root].counter : 0;
    callback(null, word + ' ' + counter);
}

function top(count, hash, callback) {
    if (parseInt(count) !== count) {
        console.log('Error! Wrong params!');
        return;
    }
    var keys = Object.keys(hash);
    keys.sort(function (a, b) {
        return hash[b].counter - hash[a].counter;
    });
    for (var i = 0; i < count; ++i) {
        callback(null, hash[keys[i]].example + ' ' + hash[keys[i]].counter);
    }
}

function worker(handler, param, callback) {
    async.waterfall([
        getGitHubApi,
        getAuthenticate,
        getRepoReadme,
        getRootsHash
    ], function (error, hash) {
        handler(param, hash, callback);
    });
}

function printResult(error, data) {
    console.log(data);
}

module.exports.count = function (word) {
    worker(count, word, printResult);
};

module.exports.top = function (count) {
    worker(top, count, printResult);
};

module.exports.count(10);
module.exports.top(10);
