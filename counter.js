'use strict';

const request = require('request');
const bluebird = require('bluebird');
const fs = require('fs');
const token = fs.readFileSync('./key.txt', 'utf-8');
const stopWords = require('./stopWords');
const snowball = require('snowball-stemmers');
const stemmer = snowball.newStemmer('russian');
const urlForRepos = 'https://api.github.com/orgs/urfu-2015/repos';
const urlForReadme = 'https://api.github.com/repos/urfu-2015/';
const options = {
    url: urlForRepos,
    headers: {
        'User-Agent': 'request',
        Authorization: 'token ' + token
    }
};
const reg = /verstka-tasks|javascript-tasks/;
var allWords = [];
bluebird.promisifyAll(request);
function getRes() {
    return request.getAsync(options)
    .then(function (response) {
        if (response.statusCode !== 200) {
            return;
        };
        var info = JSON.parse(response.body);
        var promises = info.reduce(function (result, obj) {
            if (reg.test(obj.name)) {
                var newOptions = {
                    url: urlForReadme + obj.name + '/readme',
                    headers: options.headers
                };
                result.push(request.getAsync(newOptions));
            }
            return result;
        }, []);
        return bluebird.all(promises);
    })
    .then(function (responses) {
        responses.forEach(function (response) {
            var info = JSON.parse(response.body);
            var task = new Buffer(info.content, 'base64').toString('utf-8');
            getWords(task);
        });
        var collection = getDict(allWords);
        return collection;
    });
};

function getWords(task) {
    var text = task.toLowerCase().replace(/[^а-яё]/g, ' ');
    text
        .split(' ')
        .filter(ruleForFilter)
        .forEach(function (word) {
            allWords.push(word);
        });
};

function ruleForFilter(word) {
    return word.length > 0 && stopWords.indexOf(word) === -1;
};

function getDict(words) {
    return words.reduce(function (result, word) {
        var stem = stemmer.stem(word);
        if (result[stem]) {
            result[stem].number = result[stem].number + 1;
        } else {
            result[stem] = {word: word, number: 1};
        }
        return result;
    }, {});
}

function getCount(word) {
    if (typeof (word) !== 'string') {
        return;
    };
    return getRes()
        .then(function (data) {
            var stem = stemmer.stem(word);
            return data[stem].number;
        });
}

function getTop(n) {
    if (typeof (n) !== 'number') {
        return;
    };
    return getRes()
        .then(function (data) {
            var res = Object.keys(data)
                    .map(function (item) {
                        return {
                            stem: item,
                            word: data[item].word,
                            number: data[item].number};
                    })
                    .sort(function (a, b) {
                        return b.number - a.number;
                    });
            return res.slice(0, n).map(function (elem) {
                return elem.word + ' ' + elem.number;
            });
        });
}

module.exports.count = getCount;
module.exports.top = getTop;
