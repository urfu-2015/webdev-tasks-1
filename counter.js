'use strict';

const request = require('request');
const fs = require('fs');
const async = require('async');
const natural = require('natural');

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_TOKEN_FILE = 'key.txt';
const GITHUB_ACCESS_TOKEN = fs.readFileSync(GITHUB_TOKEN_FILE, 'utf-8');
const USERNAME = 'urfu-2015';
const STOP_WORDS_FILE = 'stop.txt';
const STOP_WORDS = fs.readFileSync(STOP_WORDS_FILE, 'utf-8').split(/\n/);

function getReposPage(callback) {
    sendRequestToGithub('/users/' + USERNAME + '/repos',
    function (err, res, body) {
        if (err) {
            callback(new Error('Error from Github API: ' + err));
        }
        if (res.statusCode !== 200) {
            callback(new Error('Wrong status from Github API: ' + res.statusCode));
        }
        callback(err, body);
        return body;
    });
}

function getReposNames(body, callback) {
    body = JSON.parse(body);
    var names = body
        .filter(function (obj) {
            return /(^verstka-tasks.*)|(^javascript-tasks.*)/.test(obj.name);
        })
        .map(function (obj) {
            return obj.name;
        });
    callback(null, names);
    return names;
}

function getReposReadme(reposNames, callback) {
    var funcs = [];
    reposNames.forEach(function (repoName) {
        funcs.push(getReadmeFromGithub.bind(this, repoName));
    });
    async.parallel(funcs,
        function (err, readmesArr) {
            callback(err, readmesArr);
            return readmesArr;
        });
}

function getReadmeFromGithub(repoName, callback) {
    sendRequestToGithub('/repos/' + USERNAME + '/' + repoName + '/readme',
        function (err, res, body) {
            if (err) {
                callback(new Error('Cannot get readme: ' + err));
            }
            if (res.statusCode !== 200) {
                callback(new Error('Wrong status from Github API: ' + res.statusCode));
            }
            var readme = new Buffer(JSON.parse(body).content, 'base64').toString('utf-8');
            callback(err, readme);
            return readme;
        }
    );
}

function parseTexts(texts, callback) {
    var words = [];
    texts.forEach(function (text) {
        text = text.toLowerCase().replace('ё', 'е').replace(/\w/g, '');
        var tokenizer = new natural.AggressiveTokenizerRu();
        var textWords = tokenizer.tokenize(text);
        textWords = textWords.filter(function (word) {
            return STOP_WORDS.indexOf(word) === -1;
        });
        words = words.concat(textWords);
    });
    callback(null, words);
}

function parseWords(words, callback) {
    var roots = {};
    words.forEach(function (word) {
        var root = natural.PorterStemmerRu.stem(word);
        if (!roots[root]) {
            roots[root] = {
                root: root,
                count: 1,
                word: word
            };
        } else {
            roots[root].count++;
        }
    });
    callback(null, roots);
}

function topCallback(n, error, roots) {
    if (error) {
        console.log('Error: ' + error);
        return;
    }
    var sortedRoots = [];
    Object.keys(roots).forEach(function (key) {
        sortedRoots.push(roots[key]);
    });
    sortedRoots = sortedRoots.sort(sortCount);
    sortedRoots.slice(0, n).forEach(function (rootObj) {
        console.log(rootObj.word + '  ' + rootObj.count);
    });
    return sortedRoots.slice(0, n);
}

function countCallback(word, error, roots) {
    if (error) {
        console.log('Error: ' + error);
        return;
    }
    var root = natural.PorterStemmerRu.stem(word);
    console.log(word + ' ' + (roots[root].count || 0));
    return roots[root].count || 0;
}

function sortCount(a, b) {
    return b.count - a.count;
}

function sendRequestToGithub(urlPart, func) {
    var reqOptions = {
        url: GITHUB_API_URL + urlPart,
        headers: {
            'User-Agent': 'js'
        },
        qs: {
            access_token: GITHUB_ACCESS_TOKEN
        }
    };
    request(reqOptions, func);
}

function getReadmesStatistics(mode, arg) {
    var func;
    if (mode !== 'top' && mode !== 'count') {
        throw (new Error('Wrong mode in getReadmesStatistics'));
    }
    if (mode === 'top') {
        func = topCallback.bind(this, arg);
    } else {
        func = countCallback.bind(this, arg);
    }
    async.waterfall([
        getReposPage,
        getReposNames,
        getReposReadme,
        parseTexts,
        parseWords
    ], func);
}
function count(word) {
    getReadmesStatistics('count', word);
}

function top(n) {
    getReadmesStatistics('top', n);
}

module.exports = {
    count: count,
    top: top
};

