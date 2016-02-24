'use strict';

const getAllReadMe = require('./getAllReadMe');
const fs = require('fs');
const natural = require('natural');

function applyToReadMe(callback) {
    var user = 'urfu-2015';
    getAllReadMe(user, function (err, texts) {
        if (err) {
            throw err;
        }
        fs.readFile('excludedWords.json', 'utf-8', function (err, data) {
            data = JSON.parse(data);
            var types = Object.keys(data);
            var excludedWords = types.reduce(function (words, type) {
                return words.concat(data[type]);
            }, [])
                .map(function (word) {
                    return word.toLowerCase();
                });
            var regExp = /[^А-Яа-я]+/g;
            var words = texts.reduce(function (words, readMe) {
                var newWords = readMe.replace(regExp, ' ')
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
        });
    });
}

var count = function (word) {
    applyToReadMe(function (err, words) {
        var count = 0;
        var rootWord = natural.PorterStemmerRu.stem(word);

        words.forEach(function (word) {
            var root = natural.PorterStemmerRu.stem(word);
            if (rootWord == root) {
                count++;
            }
        });
        console.log(count);
    });
};

var top = function (n) {
    applyToReadMe(function (err, words) {
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
        console.log(res);
    });
};



module.exports = {
    top: top,
    count: count
};
