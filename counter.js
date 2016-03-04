'use strict';

const request = require('request');
const natural = require('natural');
var stemmer = natural.PorterStemmerRu;
stemmer.attach();
const fs = require('fs');
const token = fs.readFileSync('token.txt');
const url = require('url');
const lodash = require('lodash');
var forbiddenWords = ['в', 'на', 'и', 'не', 'по', 'у', 'к', 'с', 'а', 'для', 'при'];

module.exports.top = function (amount) {
    getDictionary('orgs/urfu-2015/repos', function (dict) {
        bySortedValue(dict, amount, function (key, value) {
            console.log(key + ': ' + value);});
    });
};

module.exports.count = function (word) {
    word = word.stem();
    getDictionary('orgs/urfu-2015/repos', function (dict) {
        var amount = dict[word] ? dict[word] : '0';
        console.log(word + ': ' + amount);
    });
};

function getDictionary (query, callback) {
    var readmes = [];
    var handledReposAmount = 0;
    sendRequest(query, function (body) {
        var repos = JSON.parse(body);
        for (var repoNumber in repos) {
            if (isRepoSatisfying(repos[repoNumber])) {
                sendRequest('repos/' + repos[repoNumber].full_name + '/readme', function (body) {
                    if (body) {
                        //var text = data.getBody().toString();
                        readmes.push(body.tokenizeAndStem(true));
                        handledReposAmount++;
                        if (handledReposAmount == repos.length) {
                            var readmesText = lodash.flatten(readmes);
                            var dict = {};
                            readmesText.forEach(function (current, index, array) {
                                if (/^[а-яё]+$/i.test(current) && forbiddenWords.indexOf(current) == -1) {
                                    dict[current] = dict[current] ? dict[current] + 1 : 1;
                                }
                            });
                            callback(dict);
                        }
                    }
                });
            } else {
                handledReposAmount++;
            }
        }
    });
}

function sendRequest(path, callback) {
    request(url.parse('https://api.github.com/' + path + '?access_token=' + token),
        {
            method: 'GET',
            headers: {
                'User-Agent': 'Readme Analyzer',
                Accept: 'application/vnd.github.VERSION.raw'
            }
        },
        function (err, response, body) {
            if (!err && response.statusCode == 200) {
                callback(body);
            } else {
                console.log(err);
            }
        });
}

function isRepoSatisfying(repo) {
    return repo &&
        (repo.full_name.indexOf('verstka-tasks') != -1 ||
        repo.full_name.indexOf('javascript-tasks') != -1);
}

function bySortedValue(obj, iterationsAmount, callback) {
    var sortedKeys = Object.keys(obj).sort(function(a,b){return obj[b]-obj[a]});

    for (var i=0; i< Math.min(sortedKeys.length, iterationsAmount); i++)
        callback(sortedKeys[i], obj[sortedKeys[i]]);
}
