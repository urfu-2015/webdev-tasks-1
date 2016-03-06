var github = require('./github_parses.js');
var natural = require('natural');
var stopWords = require('./stop_words.js');
var events = require('events');
var eventEmitter = new events.EventEmitter();
var async = require('async');
var ArrayStream = require('arraystream');
var Promise = require('bluebird');
var through2 = require('through2');

// Храним статистику
// Слово -> ['однокоренные']
var resTokens = {};
var sortStat = [];

// Подсчет статистики немного асинхронный
// поэтому устанавливаем переменную, когда считаем
// чтобы сделать синхронно
var calcInProgress = false;

/**
 * Стемминг токена
 * @param token
 * @returns {String}
 */
function stemToken(token) {
    return natural.PorterStemmerRu.stem(token);
}

/**
 * Сравнение на 'однокоренные' слова
 * С магической константой
 * @param token1
 * @param token2
 * @returns {boolean}
 */
function isCognatesWords(token1, token2) {
    return natural.JaroWinklerDistance(token1, token2) > 0.8;
}

/**
 * Степень похожести слов
 * @param token1
 * @param token2
 * @returns {Number}
 */
function congateRate(token1, token2) {
    return natural.JaroWinklerDistance(token1, token2);
}

/**
 * По слову находим самое 'однокоренное'
 * @param word
 * @returns {string}
 */
function nearestWord(word) {
    var bestWordRate = 0;
    var bestWord = '';
    for (var key in resTokens) {
        if (congateRate(key, word) >= bestWordRate) {
            bestWord = key;
            bestWordRate = congateRate(key, word);
        }
    }
    return bestWord;
}

var filterStopWordsTransform = through2.obj(function (chunk, enc, callback) {
    chunk = chunk.toLowerCase();
    if (!~stopWords.indexOf(chunk)) {
        this.push(chunk);
    }
    callback();
});

var stemmingTransform = through2.obj(function (chunk, enc, callback) {
    this.push([chunk, stemToken(chunk)]);
    callback();
});

var calculations = new Promise((resolve, reject) => {
    var allReadmeTexts = Promise.promisify(github.getAllTasksReadme);
    allReadmeTexts(null).then(function (text) {
        var tokens = tokenize(text);
        var arrStream = ArrayStream
            .create(tokens)
            .pipe(filterStopWordsTransform)
            .pipe(stemmingTransform);
        arrStream.on('data', function (chunk) {
            var stemmedToken = chunk[1];
            var token = chunk[0];
            clasterCognatesWords(token, stemmedToken);
        });
        arrStream.on('end', function () {
            sortCognatesWords();
            //console.log(resTokens);
            resolve();
        })
    });
});

function tokenize(text) {
    return text.match(/[а-яА-я]+/g);
}

function clasterCognatesWords(token, stemmedToken) {
    if (!resTokens[token]) {
        // Проверяем слово с представителями 'однокоренных'
        // (ключами словаря)
        // Если совпадение 'хорошее', то добавим его в однокоренные
        var added = false;
        for (var key in resTokens) {
            if (congateRate(stemToken(key), stemmedToken) > 0.87) {
                resTokens[key].push(token);
                added = true;
            }
        }
        // Если слово не 'совпало' ни с одним,
        // полагаем, что это слово с новым корнем
        if (!added) {
            resTokens[token] = [token];
        }
    } else {
        resTokens[token].push(token);
    }
}

function sortCognatesWords() {
    sortStat = Object.keys(resTokens).map(function (key) {
        return [key, resTokens[key].length];
    });
    sortStat.sort(function (first, second) {
        return second[1] - first[1];
    });
}

/**
 * Топ n слов
 * @param n
 */
function top(n) {
    function printResults() {
        eventEmitter.emit('calcFinished');
        calcInProgress = false;
        sortStat.slice(0, n).forEach((item) => {
            console.log(item[0], item[1]);
        });
    }
    // Если еще не делали анализ
    if (!sortStat.length && !calcInProgress) {
        calcInProgress = true;
        calculations.then(printResults);
    } else {
        // Если кто-то считает уже, то
        // ждем, пока досчитается
        eventEmitter.once('calcFinished', printResults);
    }
}

//top(15);

/**
 * Число повторений данного слова
 * Либо самое похожее на него
 * @param word
 */
function count(word) {
    function printResults() {
        eventEmitter.emit('calcFinished');
        calcInProgress = false;
        if (!resTokens[word]) {
            console.log('Такого слова в статистике нет');
            console.log('Билжайшее к нему:', nearestWord(word), '- попробйте его');
        } else {
            sortStat.forEach(function(elem) {
                if (elem[0] === word) {
                    return elem[1];
                    //console.log(elem[1]);
                }
            });
        }
    }
    // Если еще не делали анализ
    if (!sortStat.length && !calcInProgress) {
        calcInProgress = true;
        calculations.then(printResults);
    } else {
        // Если кто-то считает уже, то
        // ждем, пока досчитается
        eventEmitter.once('calcFinished', printResults);
    }
}

//count('котиков');

module.exports.count = count;
module.exports.top = top;
module.exports.resTokens = resTokens;
