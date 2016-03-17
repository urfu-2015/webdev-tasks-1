'use strict';
const config = require('./config');

function options(url) {
    return {
        uri: url,
        headers: {
            'User-Agent': 'Request-Promise'
        },
        qs: {
            access_token: config.token, // -> url + '?access_token=x'
            per_page: 100
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

function getTextArray(text) {
    var textArray = sanitize(text).split(' ');

    var result = [];
    for (var i in textArray) {
        if (textArray[i].length <= 1 ||
            config.prepsAndConjs.indexOf(textArray[i].toLowerCase()) + 1) {
            continue;
        }
        result.push(textArray[i]);
    }
    //console.log(result);
    return result;
}

function sanitize(text) {
    text = text.replace(/\r\n/g, ' ')
        .replace(/<img.+>/g, ' ')
        .replace(/https?:\/\/([-\w]+\.)+\w+\/([.\w=\?-]+\/?)+(\.\w+)*([.\w=\?-]+\/?)/ig, ' ')
        .replace(/[^a-zа-яё'-]+/ig, ' ')
        .replace(/([a-z])'([а-я])/ig, '$1$2') // апостроф в формах слов
        .replace(/'/g, '') // остальные апострофы
        .replace(/ -+ /g, ' ') // длинные и короткие тире
        .replace(/([а-яa-z])- /ig, '$1 ') // дефисы, оставшиеся после обрезки числовой части
        .replace(/ -([а-яa-z])/ig, ' $1')
        .replace(/ [a-zа-я] /ig, ' ')
        .replace(/\s{2,}/g, ' '); // пробелы количеством больше одного
    //console.log(text);
    return text;
}

function getStemOfWord(word) {
    return config.natural.stem(word);
}

function getStemOfKeys(dictionary) {
    var keys = Object.keys(dictionary);
    keys.map(function (key) {
        return getStemOfWord(key);
    });
    //for (var i in keys) {
        //keys[i] = getStemOfWord(keys[i]);
    //}
    return keys;
}

function filterRepos(list) {
    var result = [];
    for (var i in list) {
        if (/.+tasks.+/.test(list[i])) {
            result.push(list[i]);
        }
    }
    return result;
}

function sortByValue(object) {
    var sortedKeys = Object.keys(object).sort(function (a, b) {
        return object[b] - object[a];
    });
    var result = {};
    sortedKeys.forEach(function(key) {
        result[key] = object[key];
    });
    return result;
}

// TODO Этот код не разбит на функции, тебе стоит подумать над разделением его на функции,
// выполняющие атомарные действия: получить список репозиториев, получить все тексты, удалить
// лишнее из текстов, получить массив слов, получить стемы (слова без окончаний), заполнить
// словарь стемов и т.п. Так легче разбираться и рефакторить код в будущем.

// TODO почему-то попадают слова с одинаковой основой
// TODO откуда-то берётся NaN

var repeatsOfWords = {};

var rp = config.request(options('https://api.github.com/users/urfu-2015/repos')).then(function(list) {
    var listOfRepos = filterRepos(getRepos(list));
    var listOfRequests = [];
    listOfRepos.forEach(function(repo) {
        listOfRequests.push(config.request(options('https://raw.githubusercontent.com/urfu-2015/'
            + repo + '/master/README.md')));
    });
    return Promise.all(listOfRequests);
}).then(function(listOfResponses) {
    listOfResponses.forEach(function(response, i) {
        var plainTextArray = getTextArray(response);
        //console.log(i + ' response!');
        plainTextArray.forEach(function(plainWord)  {
            var word = plainWord.toLowerCase();
            // TODO stemKeys вызывается много раз, вызывая natural для всех слов, делая одну и
            // ту же работу. Измени логику работы, чтобы не выполнять лишние действия
            if (getStemOfKeys(repeatsOfWords).indexOf(getStemOfWord(word)) === -1) {
                repeatsOfWords[word] = 1;
            } else {
                repeatsOfWords[word]++;
            }
        });
    });
    repeatsOfWords = sortByValue(repeatsOfWords);
    return repeatsOfWords;
}).catch(function(error) {
    console.error(error);
});

function isCorrectWord (word) {
    if (typeof word !== 'string') {
        console.error('Введите слово для проверки');
        return false;
    }
    if (word.length === 0) {
        console.error('Введите непустое слово для проверки');
        return false;
    }

    return true;
}


module.exports.count = function (word) {
    if (isCorrectWord(word)) {
        rp.then(function() {
            var stemmedWordIndex = getStemOfKeys(repeatsOfWords).indexOf(getStemOfWord(word));
            if (stemmedWordIndex < 0) {
                console.error('Такого слова нам не встречалось ');
                return;
            }

            var numOfRepeats = repeatsOfWords[Object.keys(repeatsOfWords)[stemmedWordIndex]];
            console.log(word + ': ' + numOfRepeats);
            return word + ': ' + numOfRepeats;
        });
    }
};

function isCorrectCountOfWord (n) {
    if (typeof n !== 'number') {
        console.error('Для рейтинга нужно число');
        return false;
    }
    if (n < 1) {
        console.error('Для рейтинга необходимо число, не меньше 1');
        return false;
    }
    return true;
}

module.exports.top = function (n) {
    if (isCorrectCountOfWord(n)) {
        rp.then(function() {
            if (n > Object.keys(repeatsOfWords).length) {
                console.log('Нет в текстах столько слов');
                return;
            }

            var topWords = Object.keys(repeatsOfWords).slice(0, n);
            var top = {};
            topWords.forEach(function(topWord) {
                top[topWord] = repeatsOfWords[topWord];
            });
            console.log(top);
            return top;
        });
    }
};
