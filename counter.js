'use strict';

const getAllReadMe = require('./getAllReadMe');
const fs = require('fs');
const natural = require('natural');

function normalizeReadMeTexts(user, callback) {
    var readMeTexts = getAllReadMe(user);
    fs.readFile('excludedWords.json', 'utf-8', function (err, data) {
        data = JSON.parse(data);
        var WordTypes = Object.keys(data);
        var excludedWords = WordTypes.reduce(function (words, type) {
                return words.concat(data[type]);
            }, [])
            .map(function (word) {
                return word.toLowerCase();
            });
        var regExp = /[^а-яё]+/g;
        readMeTexts.then(function (texts) {
            var words = texts.reduce(function (words, text) {
                var newWords = text.replace(regExp, ' ')
                    .trim()
                    .split(' ')
                    .map(function (word) {
                        return word.toLowerCase();
                    })
                    .filter(function (word) {
                        return excludedWords.indexOf(word) == -1;
                    });
                return words.concat(newWords);
            }, []);
            callback(null, words);
        }, function (err) {
            callback(err);
        });
    });
}

var user = 'urfu-2015';

var count = function (word, callback) {
    normalizeReadMeTexts(user, function (err, words) {
        if (err) {
            callback(err);
            return;
        }
        var count = 0;
        var rootWord = natural.PorterStemmerRu.stem(word);

        words.forEach(function (word) {
            var root = natural.PorterStemmerRu.stem(word);
            if (rootWord == root) {
                count++;
            }
        });
        callback(null, count);
    });
};

var top = function (n, callback) {
    normalizeReadMeTexts(user, function (err, words) {
        if (err) {
            callback(err);
            return;
        }
        var statistics = {};

        words.forEach(function (word) {
            var main = natural.PorterStemmerRu.stem(word);
            if (!statistics[main]) {
                statistics[main] = {
                    word: word,
                    count: 1
                };
                return;
            }
            statistics[main].count++;
        });
        var top = [];
        for (var i = 0; i < n; i++) {
            top.push({word: null, count: 0});
        }
        var roots = Object.keys(statistics);
        top = roots.reduce(function (top, root) {
            var data = statistics[root];
            var isAdded = false;
            for (var i = 0; i < n; i++) {
                if (!isAdded && top[i].count < data.count) {
                    top.splice(i, 0, data);
                    top.pop();
                    isAdded = true;
                }
            }
            return top;
        }, top);
        var res = top.reduce(function (res, data) {
            var line = data.word + ' ' + data.count;
            if (res == '') {
                return line;
            }
            return res + '\n\r' + line;
        }, '');
        callback(null, res);
    });
};

module.exports = {
    top: top,
    count: count
};
