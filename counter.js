'use strict';
var request = require('./node_modules/sync-request');
var natural = require('natural').PorterStemmerRu;
var fs = require('fs');
var token = fs.readFileSync('./key.txt', 'utf-8');
//console.log(natural.stem('бабуленькиных'));

function options () {
    return {
        headers: {
            'User-Agent': 'request'
        },
        qs: {
            access_token: token // -> uri + '?access_token=xxxxx%20xxxxx'
        }
    }
}

//TODO заменить перед PR имя репозитория!!!

function getRepos (listOfReposData) {
    var listOfRepos = [];
    var repoInfo = JSON.parse(listOfReposData);
    for (var i in repoInfo) {
        listOfRepos.push(repoInfo[i].name);
    }
    return listOfRepos;
}

function sanitize (text) {
    text = text.replace(/\r\n/g, ' ')
        .replace(/<img.+>/g, ' ')
        .replace(/https?:\/\/(\w+\.)+\w+\/([\w\-]+\/?)+(\.\w+)*/g, ' ')
        .replace(/[^a-zа-яё\-']+/ig, ' ')
        .replace(/'([а-я])/, '$1') // апостроф в формах слов
        .replace(/ -+ /ig, ' ') // длинные и короткие тире
        .replace(/([а-яa-z])- /, '$1 ') // дефисы, оставшиеся после обрезки числовой части
        .replace(/\s{2,}/g, ' '); // пробелы, количеством больше одного
    var textArray = text.split(' ');
    var prepsAndConjs =
        fs.readFileSync('./forbiddenWords.txt', 'utf-8');
    var arrOfPrepsAndConjs = prepsAndConjs.split('\n');

    // сама собой в конце файла возникает переход на след. строку,
    // из-за него в массиве пустой элемент
    if (arrOfPrepsAndConjs[arrOfPrepsAndConjs.length - 1].length === 0) {
        arrOfPrepsAndConjs.pop();
    }
    //console.log(arrOfPrepsAndConjs);

    for (var i in textArray) {
        //var word = textArray[i].toLowerCase();
        if (textArray[i] === '') {
            textArray.splice(i, 1);
            continue;
        }
        if (arrOfPrepsAndConjs.indexOf(textArray[i].toLowerCase()) + 1) {
            textArray.splice(i, 1);
        }
    }
}
/**
 * @param1 слово, у которого смотрим повторы, или число для рейтинга самых частых слов
 * @param2 навальное значение числа повторений слова или пустой словарь повторов слов
 */
function sendRequest (param1, param2) {
    var list = request('GET', 'https://api.github.com/users/urfu-2015/repos', options())
        .getBody('utf8');

    var listOfRepos = getRepos(list);
    for (var i in listOfRepos) {
        console.log('Смотрим репозиторий ' + listOfRepos[i]);
        var response = request('GET', 'https://raw.githubusercontent.com/urfu-2015/' +
            listOfRepos[i] + '/master/README.md', options());
        if (response.statusCode === 200) {
            var plainTextArray = sanitize(response.getBody('utf8'));
            for (var k in plainTextArray) {
                var word = plainTextArray[k].toLowerCase();
                if (typeof param1 === 'string') {
                    //TODO стеммить
                    if (word === param1) {
                        param2++;
                    }
                } else {
                    if (Object.keys(param2).indexOf(word) < 0) {
                        param2[word] = 1;
                    } else {
                        param2[word]++;
                    }
                }
            }
        }
    }
    return param2;
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
    var repeats = 0;
    repeats = sendRequest(word, repeats);

    if (repeats === 0) {
        console.log('Такого слова нам не встречалось');
        return;
    }

    console.log(word + ':' + repeats);
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

    var repeatsOfWords = {};
    repeatsOfWords = sendRequest(n, repeatsOfWords);
    console.log(repeatsOfWords);
    if (n > Object.keys(repeatsOfWords).length) {
        console.log('Нет в текстах столько слов');
        return;
    }

    var sortedByValue = Object.keys(repeatsOfWords).sort(function(a, b){
        return repeatsOfWords[b] - repeatsOfWords[a];
    }).slice(0, n);
    for (var i in sortedByValue) {
        console.log(sortedByValue[i] + ': ' + repeatsOfWords[sortedByValue[i]]);
    }
};
