'use strict';

const request = require('request');
const token = require('./key').token;
const wordsToIgnore = require('./wordsToIgnore');
const snowball = require('snowball-stemmers');

var stemmer = snowball.newStemmer('russian');
var reposURL = 'https://api.github.com/users/urfu-2015/repos';

module.exports.top = function (n) {
    doRequest(function (err, result) {
        getTop(result, n);
    });
};

module.exports.count = function (word) {
    doRequest(function (err, result) {
        getCount(result, word);
    });
};

function doRequest(callback) {
    request(getOptions(reposURL), function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var repos = JSON.parse(body);
            var promises = [];
            repos.forEach(function (repo) {
                if (repo.name.indexOf('tasks') != -1) {
                    var repoURL = 'https://api.github.com/repos/urfu-2015/';
                    var readmeURL = repoURL + repo.name + '/contents/README.md?ref=master';
                    promises.push(getReadMe(readmeURL));
                }
            });
            Promise.all(promises).then(res => {
                var result = getResult(getWords(res));
                callback(null, result);
            });
        }
    });
}

function getOptions(reqURL) {
    return {
        url: reqURL,
        headers: {
            'User-Agent': 'request',
            authorization: token
        }
    };
};

function getReadMe(url) {
    return new Promise(function (resolve, reject) {
        request(getOptions(url), function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var json = JSON.parse(body);
                var text = new Buffer(json.content, 'base64').toString('utf-8');
                resolve(text);
            } else {
                reject(error);
            }
        });
    });
};

function getWords(tasks) {
    var words = [];
    var task = tasks[0];
    tasks.forEach(function (task) {
        var text = task.replace(/[^А-Яа-яЁё]/g, ' ');
        text.split(' ')
            .filter(filterWords)
            .forEach(function (word) {
                words.push(word.toLowerCase());
            });
    });
    return words;
};

function filterWords(word) {
    if (word.length > 0 && wordsToIgnore.indexOf(word.toLowerCase()) < 0) {
        return true;
    }
    return false;
};

function getResult(words) {
    var result = [];
    words.forEach(function (word) {
        var stem = stemmer.stem(word);
        var element = result.filter(function (obj) {
            return obj.stem === stem;
        });
        if (element.length != 0) {
            element[0].words.push(word);
        } else {
            result.push({stem: stem, words: [word]});
        }
    });
    return result.sort(compare);
};

function compare(a, b) {
    if (a.words.length > b.words.length) {
        return -1;
    }
    if (a.words.length < b.words.length) {
        return 1;
    }
    return 0;
};

function getTop(result, n) {
    if (n >= result.length) {
        n = result.length;
    }
    for (var i = 0; i < n; i++) {
        var str = result[i].words[0] + ' ' + result[i].words.length;
        console.log(str);
    }
};

function getCount(result, word) {
    var stem = stemmer.stem(word);
    var element = result.filter(function (obj) {
        return obj.stem === stem;
    });
    if (element.length > 0 && element[0].words.indexOf(word) != -1) {
        console.log(element[0].words.length);
    } else {
        console.log(0);
    }
};
