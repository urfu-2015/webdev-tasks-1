/**
* @author Savi
*/

const async = require('async');
const config = require('./config');
const httpLogic = require('./httpLogic');
const parseLogic = require('./parseLogic');

var cacheWords;
var cacheWordsRoots;
var topList = {};
var usedWords = [];

/**
 * Функция, которая получает на вход слово и подсчитывает все его вхождения,
 * учитывая однокоренные слова.
 * @param {string} word
 */
function count(word) {
    async.waterfall([
        async.apply(httpLogic.getTasks, config.jsTasksPrefix, config.verstkaTasksPrefix),
        parseLogic.clean,
        httpLogic.getWordsAndRoots
    ], function (err, wordsList, wordsRoots) {
        if (!err) {
            cacheWords = wordsList;
            cacheWordsRoots = wordsRoots;
            topList[word] = extendCount(word);
            console.log(topList[word]);
        } else {
            console.error(err);
        }
    });
}

function extendCount(word) {
    var result = 0;

    cacheWords.forEach(function (item) {
        if ((usedWords.indexOf(item) === -1) &&
            (cacheWordsRoots[word] === cacheWordsRoots[item])) {
            result++;
        }
    });

    usedWords.push(word);

    return result;
}

/**
 * Функция, которая выводит top n слов.
 * @param {Number} n
 */
function top(n) {
    async.waterfall([
        async.apply(httpLogic.getTasks, config.jsTasksPrefix, config.verstkaTasksPrefix),
        parseLogic.clean,
        httpLogic.getWordsAndRoots
    ], function (err, wordsList, wordsRoots) {
        if (!err) {
            cacheWords = wordsList;
            cacheWordsRoots = wordsRoots;
            cacheWords.forEach(function (word) {
                if (!(word in topList)) {
                    topList[word] = extendCount(word);
                }
            });
            var sortableRes = [];
            for (var word in topList) {
                sortableRes.push([word, topList[word]]);
            }
            sortableRes.sort(function (a, b) {
                return a[1] - b[1];
            });
            var result = getTop(sortableRes.reverse().slice(0, n));
            console.log(result);
        } else {
            console.error(err);
        }
    });
}

/**
 * Преобразование top'а в красивый массив.
 * @param {Array} list
 * @return {Array} prettyTop
 */
function getTop(list) {
    var prettyTop = [];

    list.forEach(function (item) {
        prettyTop.push(item[0].toString() + ': ' + item[1].toString());
    });

    return prettyTop;
}

module.exports.count = count;
module.exports.top = top;
