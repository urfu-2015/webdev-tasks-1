'use strict';

const natural = require('natural');
const request = require('request');
const fs = require('fs');
const nowords = require('./nowords');
const token = fs.readFileSync('./key.txt', 'utf-8');

function getWordsFromAllReadMe(callback) {
    var repURL = 'https://api.github.com/orgs/urfu-2015/repos?access_token=' + token;
    request(getDictOptions(repURL), function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var repos = JSON.parse(body);
            var urls = [];
            repos.forEach(function (rep) {
                var name = rep.name;
                if (name.indexOf('verstka-tasks') != -1 || name.indexOf('javascript-tasks') != -1) {
                    urls.push(getURLOfRep(name));
                }
            });
            var count = 0;
            var next = function (err, data) {
                count++;
                if (urls.length == count || err) {
                    return callback(err, data);
                }
            };
            var words = [];
            urls.forEach(function (url) {
                getReadMe(url, words, next);
            });
        } else {
            callback(err ? err : 'Status code: ' + response.statusCode);
        }
    });
}

function getDictOptions(curURL) {
    return {
        url: curURL,
        headers: {
            'User-Agent': 'request'
        }
    };
};

function getURLOfRep(name) {
    return 'https://api.github.com/repos/urfu-2015/' + name + '/readme?access_token=' + token;
}

function getReadMe(url, words, callback) {
    request(getDictOptions(url), function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var content = new Buffer(JSON.parse(body).content, 'base64').toString('utf-8');
            words = getFilteredWords(content, words);
            callback(null, words);
        } else {
            callback(err ? err : 'Status code: ' + response.statusCode);
        }
    });
}

function getFilteredWords(text, words) {
    var allWords = getListOfWords(text);
    return getWordsWithoutNowords(allWords, words);
}

function getListOfWords(text) {
    text = text.replace(/[^A-zЁёА-я ]/g, ' ').replace(/[\`\^\\_\[\]]/g, ' ').toLowerCase();
    return text.split(' ');
}

function getWordsWithoutNowords(allWords, words) {
    allWords.forEach(function (word) {
        if (word && nowords.indexOf(word) == -1) {
            words.push(word);
        }
    });
    return words;
}

function getStats(allWords) {
    var stemDict = [];
    allWords.forEach(function (word) {
        if ('абвгдеёжзийклмнопрстуфхцчшщьыъэюя'.indexOf(word.charAt(0)) == -1) {
            return;
        }
        var stem = natural.PorterStemmerRu.stem(word);
        var index = stemDict.findIndex(currentStem => currentStem.stem == stem);
        if (index == -1) {
            stemDict.push({
                word: word,
                stem: stem,
                count: 1
            });
        } else {
            stemDict[index].count++;
        }
    });
    return stemDict.sort(compareStems);
}

function compareStems(word1, word2) {
    return word2.count - word1.count;
}

module.exports.top = function (n, callback) {
    var allResults = [];
    getWordsFromAllReadMe(function (err, allWords) {
        if (err) {
            callback(err);
        } else {
            allResults = getStats(allWords);
            var resultsN = [];
            for (var i = 0; i < n; i++) {
                resultsN.push(allResults[i].word + ' ' + allResults[i].count);
            }
            callback(null, resultsN);
        }
    });
};

module.exports.count = function (word, callback) {
    var results = [];
    getWordsFromAllReadMe(function (err, allWords) {
        if (err) {
            callback(err);
        } else {
            results = getStats(allWords);
            var resultWord = results.find(cur => natural.PorterStemmerRu.stem(word) == cur.stem);
            callback(null, resultWord ? resultWord.count : 0);
        }
    });
};
