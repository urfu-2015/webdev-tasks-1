const request = require('request');
const fs = require('fs');
const natural = require('natural');
const async = require('async');

const badWords = ['не', 'в', 'на', 'к', 'из', 'по', 'а', 'и', 'над', 'у', 'под', 'для', 'за', 'с'];
const wordRE = /([а-яё]+)/gi;
const GITHUB_TOKEN = fs.readFileSync('./key.txt', 'utf-8');

var cachedDictionary;

module.exports.top = getTopWords;
module.exports.count = getWordCount;

function getReadme(repoName, callback) {
    request({
        url: 'https://api.github.com/repos/urfu-2015/' + repoName + '/readme',
        encoding: 'utf-8',
        headers: {
            'User-Agent': 'NikShel',
            Authorization: 'token ' + GITHUB_TOKEN,
            Host: 'api.github.com'
        }
    }, function (error, response, body) {
        if (error || response.statusCode !== 200) {
            throw Error('Ошибка при запросе к серверу: ' + error);
        }
        var resultJson = JSON.parse(body);
        if (resultJson.encoding != 'base64') {
            throw new Error('Формат не поддерживается');
        }
        var text = Buffer(resultJson.content, 'base64').toString('utf-8');
        callback(text);
    });
}

function getWordsFromText(text) {
    return text.match(wordRE)
        .map(function (word) {
            return word.toLocaleLowerCase();
        })
        .filter(function (word) {
            return (badWords.indexOf(word) == -1);
        });
}

function addWords(dictionary, words) {
    words.forEach(function (word) {
        var stem = natural.PorterStemmerRu.stem(word);
        if (dictionary[stem] == undefined) {
            dictionary[stem] = 1;
        } else {
            dictionary[stem]++;
        }
    });
}

function getDictionary(callback) {
    if (cachedDictionary != undefined) {
        callback(cachedDictionary);
        return;
    }
    var dictionary = {};
    var tasks = [];
    for (var i = 1; i <= 10; i++) {
        ['verstka-tasks-', 'javascript-tasks-'].forEach(function (repoName) {
            var currentIndex = i;
            tasks.push(function (localCallback) {
                var fullRepoName = repoName + currentIndex.toString();
                getReadme(fullRepoName, function (text) {
                    var words = getWordsFromText(text);
                    addWords(dictionary, words);
                    console.log('Обработан репозиторий  ' + fullRepoName);
                    localCallback();
                });
            });
        });
    }
    async.parallel(tasks, function () {
        cachedDictionary = dictionary;
        callback(dictionary);
    });
}

function getWordCount(word, callback) {
    var stem = natural.PorterStemmerRu.stem(word);
    getDictionary(function (dictionary) {
        var count = dictionary[stem];
        callback(count);
    });
}

function getTopWords(n, callback) {
    getDictionary(function (dictionary) {
        var result = Object.keys(dictionary)
            .map(function (key) {
                return {
                    stem: key,
                    count: dictionary[key]
                };
            })
            .sort(function (item1, item2) {
                if (item1.count > item2.count) {
                    return -1;
                }
                if (item1.count < item2.count) {
                    return 1;
                }
                return 0;
            })
            .slice(0, n)
            .map(function (item) {
                return item.stem + ' --- ' + item.count;
            });
        callback(result);
    });
}

function test() {
    getTopWords(10, function (topWords) {
        console.log('Топ 10 основ слова:');
        topWords.forEach(function (result) {
            console.log(result);
        });
        getWordCount('элементы', function (count) {
            console.log('Слова с основой как у слова "элементы" встречаются ' + count + ' раз');
        });
    });
}
