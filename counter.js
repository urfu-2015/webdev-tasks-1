var github = require('./github_parses.js');
var natural = require('natural');
var stopWords = require('./stop_words.js');
var events = require('events');
var eventEmitter = new events.EventEmitter();

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

/**
 * Разбивание текста на токены
 * @param text
 * @param cb
 */
function tokenize(text, cb) {
    var res = text.match(/[а-яА-я]+/g);
    cb(res);
}

/**
 * Фильтрация стоп-слов (предлогов и тд.)
 * @param tokens
 * @param cb
 */
function filterStopWords(tokens, cb) {
    tokens = tokens.map(function(token) {
        return token.toLowerCase();
    });
    var res = tokens.filter(function(a){return !~this.indexOf(a);},stopWords);
    //res = tokens.filter(function(a){return !a.match(/[а-яА-я]{1,2}/g);});
    cb(res);
}

/**
 * Стемминг списка слов
 * @param tokens
 * @param cb
 */
function stemming(tokens, cb) {
    var stemmedTokens = tokens.map(function(token) {
        return stemToken(token);
    });
    cb(tokens, stemmedTokens);
}

/**
 * Разбивание слов на классы 'однокоренных'
 * @param tokens
 * @param stemmedTokens
 * @param cb
 */
function sortCognatesWords(tokens, stemmedTokens, cb) {
    stemmedTokens.forEach(function(stemmedToken, idx) {
        if (!resTokens[tokens[idx]]) {
            // Проверяем слово с представителями 'однокоренных'
            // (ключами словаря)
            // Если совпадение 'хорошее', то добавим его в однокоренные
            var added = false;
            for (var key in resTokens) {
                if (congateRate(stemToken(key), stemmedToken) > 0.87) {
                    resTokens[key].push(tokens[idx]);
                    added = true;
                }
            }
            // Если слово не 'совпало' ни с одним,
            // полагаем, что это слово с новым корнем
            if (!added) {
                resTokens[tokens[idx]] = [tokens[idx]];
            }
        } else {
            resTokens[tokens[idx]].push(tokens[idx]);
        }
    });
    sortStat = Object.keys(resTokens).map(function (key) {
        return [key, resTokens[key].length];
    });
    sortStat.sort(function (first, second) {
        return second[1] - first[1];
    });
    cb();
}

/**
 * Последовательно делаем анализ
 * Результат кладем в глобальную переменную
 * @param cb
 */
function calculate(cb) {
    github.getAllTasksReadme(function(text){
        tokenize(text, function(tokens) {
            filterStopWords(tokens, function(tokens) {
                stemming(tokens, function(tokens, stemmedTokens) {
                    sortCognatesWords(tokens, stemmedTokens, cb);
                })
            })
        })
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
        sortStat.slice(0, n).forEach(function(item) {
            console.log(item[0], item[1]);
        });
    }
    // Если еще не делали анализ
    if (!sortStat.length && !calcInProgress) {
        eventEmitter.emit('calcInProgress');
        calcInProgress = true;
        calculate(printResults);
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
        eventEmitter.emit('calcInProgress');
        calcInProgress = true;
        calculate(printResults);
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

