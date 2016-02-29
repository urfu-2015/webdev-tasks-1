'use strict';

const fs = require('fs');
const request = require('request');
const http = require('http');
const async = require('async');
const natural = require('natural');
natural.PorterStemmerRu.attach();
const token = fs.readFileSync('./key.txt', 'utf-8');
const reposUrl = 'https://api.github.com/orgs/urfu-2015/repos';


function getStat(method, arg) {
    async.waterfall(
        [
            function getRepos(callback) {
                request(getRequestOptions(reposUrl), function (err, response, body) {
                    var resp;
                    if (!err && response.statusCode === 200) {
                        resp = JSON.parse(body);
                        callback(null, resp);
                    } else {
                        callback(err, resp);
                        console.log(response.statusCode);
                    }
                });
            },

            function getReadmeWords(repos, callback) {
                var words = {};
                const org = 'https://api.github.com/repos/urfu-2015/';
                const readmePaths = [];
                repos.forEach(function (repo) {
                    const name = repo.name;
                    if (name && name.indexOf('tasks') !== -1) {
                        readmePaths.push(org + name + '/readme');
                    }
                });

                async.each(
                    readmePaths,

                    function (path, next) {
                        request(getRequestOptions(path), function (err, response, body) {
                            if (!err && response.statusCode === 200) {
                                const readme = new Buffer(
                                    JSON.parse(body).content, 'base64').toString('utf-8');
                                const readmeWords = parseText(readme);
                                readmeWords.forEach(function (word) {
                                    let lower = word.toLowerCase();
                                    words[lower] = words[lower] ? ++words[lower] : 1;
                                });
                                next();
                            } else {
                                next(err);
                            }
                        });
                    },

                    function (err) {
                        callback(err, words);
                    });
            },

            function printStat(words, callback) {
                const wordsArr = Object.keys(words);
                const resultObj = {};
                const resultArr = [];
                const roots = {};
                wordsArr.forEach(function (word) {
                    let stem = word.stem();
                    resultObj[stem] = resultObj[stem] ? resultObj[stem] + words[word] : words[word];
                    if (roots[stem]) {
                        roots[stem].push(word);
                    } else {
                        roots[stem] = [word];
                    }
                });
                if (method === 'top') {
                    const rootsArr = Object.keys(resultObj);
                    rootsArr.forEach(function (r) {
                        resultArr.push({root: r, value: resultObj[r]});
                    });
                    resultArr.sort(function (r1, r2) {
                        return r2.value - r1.value;
                    });
                    const top = resultArr.slice(0, arg);
                    top.forEach(function (r) {
                        console.log(roots[r.root] + ' ' + r.value);
                    });
                } else if (method === 'count') {
                    let root = arg.stem();
                    console.log(roots[root] + ' ' + resultObj[root]);
                }
            }
        ]);
}

function parseText(text) {
    return text.split(/[^А-Яа-яЁё]+/);
}

function getRequestOptions(url) {
    return {
        url: url,
        headers: {'user-agent': 'webstorm'},
        authorization: token
    };
}

module.exports.top = function (n) {
    getStat('top', n);
};

module.exports.count = function (word) {
    getStat('count', word);
};
