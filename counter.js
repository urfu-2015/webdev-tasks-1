'use strict';

const request = require('request');
const token = require('./key').token;
const wordsToIgnore = require('./wordsToIgnore');
const snowball = require('snowball-stemmers');

var stemmer = snowball.newStemmer('russian');
var reposURL = 'https://api.github.com/users/urfu-2015/repos';

module.exports.top = function (n) {
    return new Promise(function (resolve, reject) {
        doRequest(function (err, result) {
            if (err) {
                //console.log('ERROR ' + err);
                reject(err);
            }
            var resTop = getTop(result, n);
            resolve(resTop);
        });
    });
};

module.exports.count = function (word) {
    return new Promise(function (resolve, reject) {
        doRequest(function (err, result) {
            if (err) {
                reject(err);
            } else {
                var resCount = getCount(result, word);
                resolve(resCount);
            }
        });
    });    
};

function doRequest(callback) {
    request(getOptions(reposURL), function (error, response, body) {
        if (!error && response.statusCode === 200) {
            var promises = [];
            body.forEach(function (repo) {
                if (repo.name.indexOf('tasks') != -1) {
                    var repoURL = 'https://api.github.com/repos/urfu-2015/';
                    var readmeURL = repoURL + repo.name + '/readme';
                    promises.push(getReadMe(readmeURL));
                }
            });
            Promise.all(promises).then(res => {
                var result = getResult(getWords(res));
                callback(null, result);
            });
        } else {
            console.log('ERROR ' + err);
        }
    });
}

function getOptions(reqURL) {
    return {
        url: reqURL,
        headers: {
            'User-Agent': 'request',
            authorization: token
        },
        json: true
    };
}

function getReadMe(url) {
    return new Promise(function (resolve, reject) {
        request(getOptions(url), function (error, response, body) {
            if (!error && response.statusCode === 200) {
                var text = new Buffer(body.content, 'base64').toString('utf-8');
                resolve(text);
            } else {
                reject(error);
            }
        });
    });
}

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
}

function filterWords(word) {
    if (word.length > 0 && wordsToIgnore.indexOf(word.toLowerCase()) < 0) {
        return true;
    }
    return false;
}

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
}

function compare(a, b) {
    if (a.words.length > b.words.length) {
        return -1;
    }
    if (a.words.length < b.words.length) {
        return 1;
    }
    return 0;
}

function getTop(result, n) {
    var str = '';
    if (n >= result.length) {
        n = result.length;
    }
    for (var i = 0; i < n; i++) {
        str += result[i].words[0] + ' ' + result[i].words.length;
        i != n - 1 ? str += '\r\n' : str = str;
    }
    return str;
}

function getCount(result, word) {
    var stem = stemmer.stem(word);
    var element = result.filter(function (obj) {
        return obj.stem === stem;
    });
    if (element.length > 0 && element[0].words.indexOf(word) != -1) {
        return element[0].words.length;
    } else {
        return 0;
    }
}
