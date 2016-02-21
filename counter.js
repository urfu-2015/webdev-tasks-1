'use strict';

const http = require('http');
const request = require('request');
const fs = require('fs');
const async = require('async');
const natural = require('natural');
require('buffer');

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TOKEN_FILE = 'key.txt';
const GITHUB_ACCESS_TOKEN = fs.readFileSync(GITHUB_TOKEN_FILE, 'utf-8');
const USERNAME = 'urfu-2015';
const STOP_WORDS_FILE = 'stop.txt';
const STOP_WORDS = fs.readFileSync(STOP_WORDS_FILE, 'utf-8').split(/\n/);

var workingFuncs = 0;

var wordsCount = {};
var roots = {};

top(10);

function getReposList(username, finalCallback) {
    var req_options = {
        url: GITHUB_API_URL + '/users/' + username + '/repos',
        headers: {
            'User-Agent': 'js'
        },
        qs: {
            access_token: GITHUB_ACCESS_TOKEN
        }
    };
    var repos = null;
    request(req_options,
        function (err, res, body) {
            if (!err && res.statusCode === 200) {
                var repos = JSON.parse(body);
                repos = repos.filter(function (json) {
                    return /(^verstka-tasks.*)|(^javascript-tasks.*)/.test(json.name);
                })
                    .map(function (json) {
                        return json.name;
                    });
                repos.forEach(function (name) {
                    getRepoReadme(username, name, finalCallback);
                    workingFuncs++;
                });
            }
        }
    );
}

function getRepoReadme(username, repoName, finalCallback) {
    // console.log(repoName);
    var req_options = {
        url: GITHUB_API_URL + '/repos/' + username + '/' + repoName + '/readme',
        headers: {
            'User-Agent': 'js'
        },
        qs: {
            access_token: GITHUB_ACCESS_TOKEN
        }
    };
    request(req_options,
        function (err, res, body) {
            if (!err && res.statusCode === 200) {
                var readme = JSON.parse(body);
                //  console.log(readme.content);
                parseText(new Buffer(readme.content, 'base64').toString('utf-8'), finalCallback);

            }
        }
    );
}

function parseText(text, finalCallback) {
    text = text.toLowerCase().replace('ё', 'е').replace(/[a-z0-9]/g, '');
    var tokenizer = new natural.AggressiveTokenizerRu();
    var words = tokenizer.tokenize(text);
    words.forEach(function (word) {
        if (!wordsCount[word]) {
            wordsCount[word] = 1;
        } else {
            wordsCount[word]++;
        }
    });
    words = words.filter(function (word) {
        return STOP_WORDS.indexOf(word) === -1;
    });
    words.forEach(function (word) {
        var root = natural.PorterStemmerRu.stem(word);
        if (!roots[root]) {
            roots[root] = {
                root: root,
                count: 1,
                words: [word]
            };
        } else {
            roots[root].count++;
            if (roots[root].words.indexOf(word) === -1) {
                roots[root].words.push(word);
            }
        }
    });
    workingFuncs--;
    if (!workingFuncs) {
        finalCallback(null);
    }
}

function top(n) {
    getReposList(USERNAME, function (err) {
        if (err) {
            console.log('ERROR');
        } else {
            var sortedRoots = [];
            for (var key in roots) {
                if (roots.hasOwnProperty(key)) {
                    sortedRoots.push(roots[key]);
                }
            }
            sortedRoots = sortedRoots.sort(sortCount);
            for (var i = 0; i < n; i++) {
                console.log(sortedRoots[i].words[0] + '  ' + sortedRoots[i].count);
            }
        }
    });
}

function count(word) {
    getReposList(USERNAME, function (err) {
        if (err) {
            console.log('Error');
        } else {
            if (!wordsCount[word]) {
                console.log(word + ' 0');
            } else {
                console.log(word + ' ' + wordsCount[word]);
            }
        }
    });
}

function sortCount(a, b) {
    return b.count - a.count;
}

