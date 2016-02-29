'use strict';

const fs = require('fs');
const request = require('request');
const natural = require('natural');
const token = fs.readFileSync('./key.txt', 'utf-8');
const ignoredWords = require('./ignoreWords').words;

var url = 'https://api.github.com/users/urfu-2015/repos';
var repoURL = 'https://api.github.com/repos/urfu-2015/';
var accessToken = '?access_token=' + token;

exports.top = function (n) {
    sendRequest(function (dict) {
        printTopWords(n, dict);
    });
};

exports.count = function (word) {
    sendRequest(function (dict) {
        getCountRepetitions(word, dict);
    });
};

function sendRequest(callback) {
    request(getRequest(url), function (err, res, body) {
        if (!err && res.statusCode === 200) {
            var data = JSON.parse(body);
            var dataWithTasks = data.filter(function (elem) {
                return (elem.name.indexOf('javascript-tasks') !== -1 ||
                        elem.name.indexOf('verstka-tasks') !== -1);
            });
            processTexts(dataWithTasks, callback);
        } else {
            console.log(err);
        }
    });
}

function getRequest(url) {
    return {
        url: url + accessToken,
        headers: {
            'User-Agent': 'request'
        }
    };
}

function processTexts(repos, callback) {
    var count = 0;
    var freqOfWords = {};
    for (var i = 0; i < repos.length; i++) {
        var urlWithName = repoURL + repos[i].name + '/readme';
        request(getRequest(urlWithName), function (err, res, body) {
            if (err) {
                throw err;
            }
            if (res.statusCode !== 200) {
                throw new Error('Server returns ' + res.statusCode);
            }
            var data = JSON.parse(body);
            var text = new Buffer(data.content, 'base64').toString('utf-8').toLowerCase();
            var words = text.replace(/[^ёа-я]/g, ' ')
                            .replace(/\s+/g, ' ')
                            .split(' ');
            words = words.filter(function (word) {
                return word.length > 0 && ignoredWords.indexOf(word) === -1;
            });
            freqOfWords = processWords(words, freqOfWords);
            count += 1;
            if (count === repos.length) {
                callback(freqOfWords);
            }
        });
    }
}

function processWords(words, freqOfWords) {
    var stems = Object.keys(freqOfWords);
    for (var i = 0; i < words.length; i++) {
        var stem = natural.PorterStemmerRu.stem(words[i]);
        if (stems.indexOf(stem) === -1) {
            freqOfWords[stem] = {
                word: words[i],
                count: 1
            };
            stems.push(stem);
        } else {
            freqOfWords[stem].count += 1;
        }
    }
    return freqOfWords;
}

function printTopWords(n, freqOfWords) {
    if (n > 0) {
        var words = Object.keys(freqOfWords);
        words.sort(function (a, b) {
            return freqOfWords[b].count - freqOfWords[a].count;
        });
        n = (n < words.length) ? n : words.length;
        for (var i = 0; i < n; i++) {
            console.log(freqOfWords[words[i]].word + ' ' + freqOfWords[words[i]].count);
        }
    }
}

function getCountRepetitions(word, freqOfWords) {
    var stem = natural.PorterStemmerRu.stem(word);
    var stems = Object.keys(freqOfWords);
    if (stems.indexOf(stem) !== -1) {
        console.log(freqOfWords[stem].count);
    } else {
        console.log(0);
    }
}
