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

function getWordsArray(text) {
    var textArray = sanitize(text).split(' ');

    var result = [];
    textArray.forEach(function (word) {
        if (word.length <= 1 ||
            config.prepsAndConjs.indexOf(word.toLowerCase()) + 1) {
            return;
        }
        result.push(word);
    });
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
    return text;
}

function getStemOfWord(word) {
    return config.natural.stem(word);
}

function getStemOfKeys(dictionary) {
    var result = Object.keys(dictionary).map(function (key) {
        return getStemOfWord(key);
    });
    return result;
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

function fillListOFRequests(listOfRepos) {
    var result = [];
    listOfRepos.forEach(function(repo) {
        result.push(config.request(options('https://raw.githubusercontent.com/urfu-2015/'
            + repo + '/master/README.md')));
    });
    return result;
}

function fillDictionaryOfRepeats(dictionary, plainTextArray, arrayOfStems) {
    plainTextArray.forEach(function(plainWord)  {
        var word = plainWord.toLowerCase();
        var stemmedWord = getStemOfWord(word);
        var indexOfStemmedWord = arrayOfStems.indexOf(stemmedWord);
        if (indexOfStemmedWord === -1) {
            arrayOfStems.push(stemmedWord);
            dictionary[word] = 1;
        } else {
            var foundWord = Object.keys(dictionary)[indexOfStemmedWord];
            dictionary[foundWord]++;
        }
    });
}

var getRepeatsOfWords =
    config.request(options('https://api.github.com/users/urfu-2015/repos')).then(function(list) {

    var listOfRequests = fillListOFRequests(filterRepos(getRepos(list)));
    return Promise.all(listOfRequests);
}).then(function(listOfResponses) {
    var repeatsOfWords = {};
    var arrayOfStems = [];
    listOfResponses.forEach(function(response) {
        fillDictionaryOfRepeats(repeatsOfWords, getWordsArray(response), arrayOfStems);
    });
    repeatsOfWords = sortByValue(repeatsOfWords);
    return Promise.resolve(repeatsOfWords);
}).catch(function(error) {
    console.error(error);
});

var errorText = '';

function isCorrectWord (word) {
    if (typeof word !== 'string') {
        errorText = 'аргумент должен быть строкой';
        return false;
    }
    if (!word.length) {
        errorText = 'пустая строка';
        return false;
    }

    return true;
}


module.exports.count = function (word) {
    if (!isCorrectWord(word)) {
        return Promise.reject('Неверный аргумент для подсчёта: ' + errorText);
    }
    return getRepeatsOfWords.then(function(repeats) {
        var stemmedWordIndex = getStemOfKeys(repeats).indexOf(getStemOfWord(word));
        if (stemmedWordIndex < 0) {
            return Promise.reject('Такого слова нам не встречалось');
        }

        var numOfRepeats = repeats[Object.keys(repeats)[stemmedWordIndex]];

        return Promise.resolve(word + ': ' + numOfRepeats);
    });
};

function isCorrectCountOfWord (n) {
    if (typeof n !== 'number') {
        errorText = 'аргумент должен быть числом';
        return false;
    }
    if (n < 1) {
        errorText = 'для рейтинга необходимо число, не меньше 1';
        return false;
    }
    return true;
}

module.exports.top = function (n) {
    if (!isCorrectCountOfWord(n)) {
        return Promise.reject('Неверный аргумент для рейтинга: ' + errorText);
    }
    return getRepeatsOfWords.then(function(repeats) {
        if (n > Object.keys(repeats).length) {
            return Promise.reject('Нет в текстах столько слов');
        }

        var topWords = Object.keys(repeats).slice(0, n);
        var top = {};

        topWords.forEach(function(topWord) {
            top[topWord] = repeats[topWord];
        });

        return Promise.resolve(top);
    });
};
