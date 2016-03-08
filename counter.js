'use strict';

const request = require('request');
const natural = require('natural');
var stemmer = natural.PorterStemmerRu;
stemmer.attach();
const fs = require('fs');
const token = fs.readFileSync('token.txt');
const url = require('url');
const lodash = require('lodash');
const async = require('async');
var forbiddenWords = ['в', 'на', 'и', 'не', 'по', 'у', 'к', 'с', 'а', 'для', 'при'];

module.exports.top = function (amount) {
    getDictionary('orgs/urfu-2015/repos', function (err, dict) {
        if (!err) {
            bySortedValue(dict, amount, function (key, value) {
                console.log(key + ': ' + value);
            });
        } else {
            console.log(err);
        }
    });
};

module.exports.count = function (word) {
    word = word.stem();
    getDictionary('orgs/urfu-2015/repos', function (err, dict) {
        if (!err) {
            var amount = dict[word] ? dict[word] : '0';
            console.log(word + ': ' + amount);
        } else {
            console.log(err);
        }
    });
};

function getDictionary(query, callback) {
    sendRequest(query, function (err, body) {
        var repos = JSON.parse(body);
        async.map(repos, function (repo, innerCallback) {
            if (isRepoSatisfying(repo)) {
                sendRequest('repos/' + repo.full_name + '/readme', function (err, body) {
                    if (err) {
                        innerCallback(err);
                    } else {
                        if (body) {
                            innerCallback(null, body.tokenizeAndStem(true));
                        } else {
                            innerCallback(null, []);
                        }
                    }
                });
            } else {
                innerCallback(null, []);
            }
        }, function (err, readmes) {
            if (err) {
                console.log(err);
            }
            var readmesText = lodash.flatten(readmes);
            var dict = {};
            readmesText.forEach(function (current, index, array) {
                if (/^[а-яё]+$/i.test(current) &&
                    forbiddenWords.indexOf(current) == -1) {
                    dict[current] = dict[current] ? dict[current] + 1 : 1;
                }
            });
            callback(err, dict);
        });
    });
}

function sendRequest(path, callback) {
    request(url.format({
            protocol: 'https',
            hostname: 'api.github.com',
            pathname: path,
            query: '?access_token=' + token
        }),
        {
            method: 'GET',
            headers: {
                'User-Agent': 'Readme Analyzer',
                Accept: 'application/vnd.github.VERSION.raw'
            }
        },
        function (err, response, body) {
            if (!err && response.statusCode == 200) {
                callback(err, body);
            } else {
                callback(err);
            }
        });
}

function isRepoSatisfying(repo) {
    return repo &&
        (repo.full_name.indexOf('verstka-tasks-1') != -1 ||
        repo.full_name.indexOf('javascript-tasks-1') != -1);
}

function bySortedValue(obj, iterationsAmount, callback) {
    var sortedKeys = Object.keys(obj).sort(function (a, b) {
        return obj[b] - obj[a];
    });

    for (var i = 0; i < Math.min(sortedKeys.length, iterationsAmount); i++) {
        callback(sortedKeys[i], obj[sortedKeys[i]]);
    }
}
