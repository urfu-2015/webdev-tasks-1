const request = require('sync-request');
const fs = require('fs');
const natural = require('natural');

const badWords = ['не', 'в', 'на', 'к', 'из', 'по', 'а', 'и', 'над', 'у', 'под', 'для', 'за', 'с'];
const wordRE = /([а-яё]+)/gi;
const GITHUB_TOKEN = fs.readFileSync('./key.txt', 'utf-8');

var cachedDictionary;

module.exports.top = getTopWords;
module.exports.count = getWordCount;

function getReadme(repoName) {
    var result = request('GET', 'https://api.github.com/repos/urfu-2015/' + repoName + '/readme', {
        headers: {
            'User-Agent': 'NikShel',
            Authorization: 'token ' + GITHUB_TOKEN,
            Host: 'api.github.com'
        }
    });
    var resultJson = JSON.parse(result.getBody('utf-8'));
    if (resultJson.encoding != 'base64') {
        throw new Error('Формат не поддерживается');
    }
    return new Buffer(resultJson.content, 'base64').toString('utf-8');
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
            dictionary[stem] = [1, word];
        } else {
            dictionary[stem][0]++;
        }
    });
}

function getDictionary() {
    if (cachedDictionary != undefined) {
        return cachedDictionary;
    }
    var dictionary = {};
    for (var i = 0; i < 10; i++) {
        ['verstka-tasks-', 'javascript-tasks-'].forEach(function (repoName) {
            var fullRepoName = repoName + (i + 1).toString();
            var text = getReadme(fullRepoName);
            console.log('Обработан репозиторий  ' + fullRepoName);
            var words = getWordsFromText(text);
            addWords(dictionary, words);
        });

    }
    cachedDictionary = dictionary;
    return dictionary;
}

function getWordCount(word) {
    var stem = natural.PorterStemmerRu.stem(word);
    var dictionary = getDictionary();
    if (dictionary[stem] == undefined) {
        return 0;
    }
    return dictionary[stem][0];
}

function getTopWords(n) {
    var dictionary = getDictionary();
    return Object.keys(dictionary)
        .map(function (key) {
            return dictionary[key];
        })
        .sort(function (item1, item2) {
            if (item1[0] > item2[0]) {
                return -1;
            }
            if (item1[0] < item2[0]) {
                return 1;
            }
            return 0;
        })
        .slice(0, n)
        .map(function (entry) {
            return entry[1] + ' ' + entry[0];
        });
}

function test() {
    var topWords = getTopWords(10);
    console.log('Топ 10 слов:');
    topWords.forEach(function (result) {
        console.log(result);
    });

    var count = getWordCount('элемент');
    console.log('Слово "элемент" встречается ' + count + ' раз');
}


