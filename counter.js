'use strict';
var fs = require('fs');
var oauth_token = fs.readFileSync('./key.txt', 'utf-8');
var async = require('async');
var forEach = require('async-foreach').forEach;
var request = require('request');

function printCountCallback(word, objectResult, resultCallback) {
    var resultValue;
    for (var i = 0;i < objectResult.length;i++) {
        if (objectResult[i][0] != '') {
            var mayInRoot = objectResult[i][1];
            for (var j = 0; j < mayInRoot.length; j++) {
                if (word == mayInRoot[j]) {
                    resultValue = mayInRoot.length;
                    resultCallback(resultValue);
                    break;
                }
            }
        }
    }
}

function printTopCallback(count, objectResult, resultCallback) {
    var results = [];
    while (count != 0) {
        var topLength = -1;
        var nowRoot = '';
        for (var i = 0;i < objectResult.length;i++) {
            if (objectResult[i][0] != '' && objectResult[i][0].length > 2) {
                var mayInRoot = objectResult[i][1];
                if (mayInRoot.length > topLength) {
                    topLength = mayInRoot.length;
                    nowRoot = objectResult[i][0];
                }
            }
        }
        count -= 1;
        var tempWords = [];
        for (var i = 0;i < objectResult.length;i++) {
            if (objectResult[i][0] == nowRoot) {
                tempWords = objectResult[i][1];
                objectResult[i][1] = [];
                break;
            }
        }
        var minLength = 999;
        var resultWord = '';
        for (var j = 0;j < tempWords.length;j++) {
            if (tempWords[j].length < minLength) {
                resultWord = tempWords[j];
                minLength = tempWords[j].length;
            }
        }
        results.push([topLength, nowRoot, resultWord]);
    }
    resultCallback(results);
}

var getStats = function (word, type, resultCallback) {
    var glResult;
    async.waterfall([
        function getRepos(callback) {
            var allowedRepos = [];
            request({
                url: 'https://api.github.com/orgs/urfu-2015/repos?access_token=' + oauth_token,
                method: 'GET',
                headers: {'user-agent': 'mdf-app'}
            }, function (error, response, body) {
                var reposArgs = [];
                var bodyJSON = JSON.parse(body);
                for (var repoId = 0; repoId < bodyJSON.length; repoId++) {
                    if (bodyJSON[repoId].name.indexOf('tasks') != -1) {
                        reposArgs.push(repoId);
                    }
                }
                callback(null, reposArgs, bodyJSON);
            });
        },
        function getReadme(reposArgs, bodyJSON, callback) {
            var result = [];
            async.eachSeries(reposArgs, function (key, next) {
                request({
                    url: 'https://api.github.com/repos/' + bodyJSON[key].full_name +
                        '/readme?access_token=' + oauth_token,
                    method: 'GET',
                    headers: {'user-agent': 'mdf-app'}
                }, function (errorRepo, responseRepo, bodyRepo) {
                    result.push(JSON.parse(bodyRepo));
                    next();
                });
            }, function (err, results) {
                callback(null, result);
            });
        },
        function getWords(bodyRepos, callback) {
            var words = [];
            async.eachSeries(bodyRepos, function (key, next) {
                request({
                    url: key.download_url,
                    method: 'GET',
                    headers: {'user-agent': 'mdf-app'}
                }, function (error, response, body) {
                    var currentWords = body
                        .replace(/[.,?!;:()"'-]/g, ' ')
                        .replace(/\s+/g, ' ')
                        .toLowerCase()
                        .split(' ');
                    for (var i = 0;i < currentWords.length;i++) {
                        words.push(currentWords[i]);
                    }
                    next();
                });
            }, function (err, results) {
                callback(null, words);
            });
        },
        function getRoots(words, callback) {
            var rootObject = [];
            async.eachSeries(words, function (key, next) {
                encodeWord = encodeURI('разбор/по-составу/' + key);
                request({
                    url: 'http://vnutrislova.net/' + encodeWord,
                    method: 'GET'
                }, function (error, response, body) {
                    var result = '';
                    if (body != undefined) {
                        var indexRoot = body.indexOf('корень');
                        if (indexRoot != -1) {
                            var startIndex = indexRoot + 8;
                            while (true) {
                                result += body[startIndex];
                                startIndex += 1;
                                if (body[startIndex] == ']') {
                                    break;
                                }
                            }
                        } else {
                            result = '';
                        }
                    }
                    var was = false;
                    for (var i = 0;i < rootObject.length;i++) {
                        if (rootObject[i][0] == result) {
                            rootObject[i][1].push(key);
                            was = true;
                        }
                    }
                    if (was == false) {
                        rootObject.push([result, [key]]);
                    }
                    next();
                });
            }, function (err, results) {
                callback(null, rootObject);
            });
        }
    ],
        function (err, returnValue) {
            if (type == 'count') {
                printCountCallback(word, returnValue, resultCallback);
            }
            if (type == 'top') {
                printTopCallback(word, returnValue, resultCallback);
            }
        });
};


module.exports.count = function (word, resultCallback) {
    getStats(word, 'count', resultCallback);
};

module.exports.top = function (count, resultCallback) {
    getStats(count, 'top', resultCallback);
};
