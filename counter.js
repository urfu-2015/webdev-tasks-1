'use strict';

const fs = require('fs');
const request = require('request');
const http = require('http');
const async = require('async');
const natural = require('natural');
const token = fs.readFileSync('./key.txt', 'utf-8');
const reposUrl = 'https://api.github.com/orgs/urfu-2015/repos';


function getTasksTexts() {
    async.waterfall(
        [
            function getRepos (callback) {
                request(getRequestOptions(reposUrl), function (err, response, body) {
                    var resp;
                    if (!err && response.statusCode === 200) {
                        resp = JSON.parse(body);
                        callback(null, resp)
                    }
                    else {
                        callback(err, resp);
                        console.log(response.statusCode);
                    }
                });
            },

            function getReadmeWords (repos, callback) {
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
                                const readme = new Buffer(JSON.parse(body).content, 'base64').toString('utf-8');
                                const readmeWords = getWords(readme);
                                readmeWords.forEach(function (word) {
                                    let lower = word.toLowerCase();
                                    words[lower] = words[lower] ? ++words[lower] : 1;
                                });
                                next();
                            }
                            else {
                                next(err);
                            }
                        });
                    },

                    function (err) {
                        callback(err, words);
                    });
            },

            function getStat (words, callback) {
                natural.PorterStemmerRu.attach();
                const wordsArr = Object.keys(words);
                const result = {};
                const roots = {};
                wordsArr.forEach(function (word) {
                    let stem = word.stem();
                    result[stem] = result[stem] ? result[stem] + words[word] : words[word];
                    if (roots[stem]) {
                        roots[stem].push(word);
                    } else {
                        roots[stem] = [word];
                    }
                });
            }
        ]);
}

function getWords(text) {
    return text.split(/[^А-Яа-яЁё]+/);
}

function getRequestOptions(url) {
    return {
        url: url,
        headers: {'user-agent': 'webstorm'},
        authorization: token
    };
}
