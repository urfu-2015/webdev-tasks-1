'use strict';
var fs = require('fs');
var token = fs.readFileSync('./key.txt', 'utf-8');

function options() {
    return {
        headers: {
            'User-Agent': 'request'
        },
        qs: {
            access_token: token // -> url + '?access_token=xxxxx'
        }
    };
}

function getRepos(listOfReposData) {
    var listOfRepos = [];
    var repoInfo = JSON.parse(listOfReposData);
    for (var i in repoInfo) {
        listOfRepos.push(repoInfo[i].name);
    }
    return listOfRepos;
}

var prepsAndConjs = fs.readFileSync('./forbiddenWords.txt', 'utf-8');
function sanitize(text) {
    text = text.replace(/\r\n/g, ' ')
        .replace(/<img.+>/g, ' ')
        .replace(/https?:\/\/(\w+\.)+\w+\/([\w\-=\?]+\/?)+(\.\w+)*/g, ' ')
        .replace(/[^a-zа-яё\-']+/ig, ' ')
        .replace(/'([а-я])/ig, '$1') // апостроф в формах слов
        .replace(/ -+ /g, ' ') // длинные и короткие тире
        .replace(/([а-яa-z])- /ig, '$1 ') // дефисы, оставшиеся после обрезки числовой части
        .replace(/\s{2,}/g, ' '); // пробелы количеством больше одного
    var textArray = text.split(' ');
    var arrOfPrepsAndConjs = prepsAndConjs.split('\n');

    // сама собой в конце файла возникает переход на след. строку,
    // из-за него в массиве пустой элемент
    if (arrOfPrepsAndConjs[arrOfPrepsAndConjs.length - 1].length === 0) {
        arrOfPrepsAndConjs.pop();
    }
    var result = [];

    for (var i in textArray) {
        if (textArray[i].length <= 1 ||
            arrOfPrepsAndConjs.indexOf(textArray[i].toLowerCase()) + 1) {
            continue;
        }
        result.push(textArray[i]);
    }
    return result;
}

function stemWord(word) {
    var natural = require('natural').PorterStemmerRu;
    return natural.stem(word);
}

function stemKeys(dictionary) {
    var keys = Object.keys(dictionary);
    for (var i in keys) {
        keys[i] = stemWord(keys[i]);
    }
    return keys;
}

var request = require('./node_modules/sync-request');
var repeatsOfWords = {};
var list = request('GET', 'https://api.github.com/users/urfu-2015/repos', options())
    .getBody('utf8');
var listOfRepos = getRepos(list);
for (var i in listOfRepos) {
    //console.log('Смотрим репозиторий ' + listOfRepos[i]);
    var response = request('GET', 'https://raw.githubusercontent.com/urfu-2015/' +
        listOfRepos[i] + '/master/README.md', options());
    if (response.statusCode === 200) {
        var plainTextArray = sanitize(response.getBody('utf8'));
        for (var k in plainTextArray) {
            var word = plainTextArray[k].toLowerCase();
            if (stemKeys(repeatsOfWords).indexOf(stemWord(word)) < 0) {
                repeatsOfWords[word] = 1;
            } else {
                repeatsOfWords[word]++;
            }
        }
    }
}

module.exports.count = function (word) {
    if (typeof word !== 'string') {
        console.log('Введите слово для проверки');
        return;
    }
    if (word.length === 0) {
        console.log('Введите непустое слово для проверки');
        return;
    }

    var stemmedWordIndex = stemKeys(repeatsOfWords).indexOf(stemWord(word));
    if (stemmedWordIndex < 0) {
        console.log('Такого слова нам не встречалось');
        return;
    }
    var numOfRepeats = repeatsOfWords[Object.keys(repeatsOfWords)[stemmedWordIndex]];
    console.log(word + ': ' + numOfRepeats);
};

module.exports.top = function (n) {
    if (typeof n !== 'number') {
        console.log('Для рейтинга нужно число');
        return;
    }
    if (n < 1) {
        console.log('Для рейтинга необходимо число, не меньше 1');
        return;
    }

    //console.log(repeatsOfWords);
    if (n > Object.keys(repeatsOfWords).length) {
        console.log('Нет в текстах столько слов');
        return;
    }

    var sortedByValue = Object.keys(repeatsOfWords).sort(function (a, b) {
        return repeatsOfWords[b] - repeatsOfWords[a];
    }).slice(0, n);
    for (var i in sortedByValue) {
        console.log(sortedByValue[i] + ': ' + repeatsOfWords[sortedByValue[i]]);
    }
};
