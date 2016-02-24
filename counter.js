'use strict';

const natural = require('natural');
const request = require('request');
const fs = require('fs');
const nowords = require('./nowords');
const token = fs.readFileSync('./key.txt', 'utf-8');

function getRequest(callback) {
    var repURL = 'https://api.github.com/orgs/urfu-2015/repos?access_token=' + token;
    request(getDictOptions(repURL), function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var items = JSON.parse(body);
            var urls = [];
            items.forEach(function (repos) {
                var name = repos.name;
                if (name.indexOf('verstka-tasks') != -1 || name.indexOf('javascript-tasks') != -1) {
                    urls.push(getURLNamedRep(name));
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

function getURLNamedRep(name) {
    return 'https://api.github.com/repos/urfu-2015/' + name + '/readme?access_token=' + token;
}

function getReadMe(url, words, callback) {
    request(getDictOptions(url), function (err, response, body) {
        if (!err && response.statusCode == 200) {
            var buff = new Buffer(JSON.parse(body).content, 'base64').toString('utf-8');
            words = getWords(buff, words);
            callback(null, words);
        }
    });
}

function getWords(text, words) {
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
    for (var i = 0; i < allWords.length; i++) {
        var word = allWords[i];
        if ('абвгдеёжзийклмнопрстуфхцчшщьыъэюя'.indexOf(word.charAt(0)) == -1) {
            continue;
        }
        var stem = natural.PorterStemmerRu.stem(word);
        var isNewWord = true;
        for (var j = 0; j < stemDict.length; j++) {
            if (stemDict[j].stem == stem) {
                stemDict[j].count++;
                isNewWord = false;
            }
        }
        if (isNewWord) {
            stemDict.push({
                word: word,
                stem: stem,
                count: 1
            });
        }
    }
    return stemDict.sort(compareStems);
}

function compareStems(word1, word2) {
    return word2.count - word1.count;
}

module.exports.top = function (n) {
    var results = [];
    getRequest(function (err, allWords) {
        if (err) {
            console.log('Error!');
        } else {
            results = getStats(allWords);
            for (var i = 0; i < n; i++) {
                console.log(results[i].word + ' ' + results[i].count);
            }
        }
    });
};

module.exports.count = function (word) {
    var results = [];
    getRequest(function (err, allWords) {
        if (err) {
            console.log('Error!');
        } else {
            results = getStats(allWords);
            var isWord = false;
            for (var i = 0; i < results.length; i++) {
                isWord = natural.PorterStemmerRu.stem(word) == results[i].stem;
                if (isWord) {
                    console.log(results[i].count);
                    break;
                }
            }
            if (!isWord) {
                console.log(0);
            }
        }
    });
};
