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
function count(word, callback) {
    async.waterfall([
        async.apply(httpLogic.getTasks, [config.configObj.jsTasksPrefix,
            config.configObj.verstkaTasksPrefix]),
        parseLogic.clean,
        httpLogic.getWordsAndRoots
    ], function (err, wordsList, wordsRoots) {
        if (!err) {
            cacheWords = wordsList;
            cacheWordsRoots = wordsRoots;
            topList[word] = extendCount(word);
            callback(null, topList[word]);
        } else {
            callback(err, null);
        }
    });
}

function extendCount(word) {
    var result = cacheWords.filter(function (item) {
        return (usedWords.indexOf(item) === -1) &&
            (cacheWordsRoots[word] === cacheWordsRoots[item]);
    });

    usedWords.push(word);

    return result.length;
}

/**
 * Функция, которая выводит top n слов.
 * @param {Number} n
 * @param {Function} callback
 */
function top(n, callback) {
    async.waterfall([
        async.apply(httpLogic.getTasks, [config.configObj.jsTasksPrefix,
            config.configObj.verstkaTasksPrefix]),
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
            callback(null, result);
        } else {
            callback(err, null);
        }
    });
}

/**
 * Преобразование top'а в красивый массив.
 * @param {Array} list
 * @return {Array} prettyTop
 */
function getTop(list) {
    return list.map(function (item) {
        return item[0].toString() + ': ' + item[1].toString();
    });
}

module.exports.count = count;
module.exports.top = top;
