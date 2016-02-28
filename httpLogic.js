/**
 * Created by savi on 27.02.16.
 */

const async = require('async');
const asyncRequest = require('request');
const config = require('./config');

/**
 * Функция создаём массив из адресов репозиториев, которые мы будем выкачивать.
 * @param prefixOne
 * @param prefixTwo
 * @returns {Array} repos
 */
function getRepos(prefixOne, prefixTwo) {
    var URIOne;
    var URITwo;

    var repos = [];

    for (var i = 1; i <= config.numberTasks; i++) {
        // Не смог найти, как здесь нормально перенести строки с этим форматом
        URIOne = `${config.gitHubApi}/repos/${config.mainRepo}/${prefixOne}${i}/readme/?access_token=${config.key}`;
        URITwo = `${config.gitHubApi}/repos/${config.mainRepo}/${prefixTwo}${i}/readme/?access_token=${config.key}`;
        repos.push(URIOne, URITwo);
    }

    return repos;
}

/**
 * Функция парсит ответ от API GitHub'а в человеко-понятный вид.
 * @param {string} res
 * @return {string} parsedContent
 */
function parseAPIResponse(res) {
    var parsedContent;

    try {
        var parsedRes = JSON.parse(res);
    } catch (err) {
        console.error(err);
    }

    try {
        parsedContent = new Buffer(parsedRes.content, parsedRes.encoding).toString('utf-8');
    } catch (err) {
        console.error(err);
    }

    return parsedContent;
}

/**
 * Функция, которая асинхронно получает тексты README.md, в зависимости от префикса тасков.
 * @param {string} prefixOne
 * @param {string} prefixTwo
 * @param {Function} callback
 */
function getTasks(prefixOne, prefixTwo, callback) {
    var responses = [];

    async.each(getRepos(prefixOne, prefixTwo),
        function (URI, cb) {
            asyncRequest({
                    url: encodeURI(URI),
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                },
                function (err, res, body) {
                    if (!err && res.statusCode === 200) {
                        responses.push(body);
                    } /* else {
                        console.error(res.statusCode);
                    } */
                    cb();
                }
            );
        },
        function (err) {
            if (!err) {
                var parsedAPIResponses = [];
                responses.forEach(function (item) {
                    parsedAPIResponses.push(parseAPIResponse(item));
                });
                callback(null, parsedAPIResponses);
            } else {
                console.error(err);
            }
        }
    );
}

/**
 * Функция, которая асинхронно получает корни для всех слов.
 * @param {Array} wordsLists
 * @param {Function} callback
 */
function getWordsAndRoots(wordsLists, callback) {
    var wordsSet = new Set();
    // Множество слов
    var words = [];
    // Просто все слова
    var wordsList = [];

    // Собираем множество
    wordsLists.forEach(function (words) {
        // Собираем список всех слов в один массив
        wordsList = wordsList.concat(words);
        words.forEach(function (word) {
            wordsSet.add(word);
        });
    });

    // Преобразуем множество обратно в массив
    wordsSet.forEach(function (word) {
        words.push(word);
    });

    var URI;

    var wordsRoots = {};

    async.each(words,
        function (word, cb) {
            URI = `${config.onlineDictHost}${config.onlineDictPath}${word}`;
            asyncRequest({
                    url: encodeURI(URI),
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Mozilla/5.0'
                    }
                },
                function (err, res, body) {
                    var root = word;
                    if (!err && res.statusCode === 200) {
                        if (config.rootRegExp.exec(body) !== null) {
                            root = config.rootRegExp.exec(body)[1];
                        }
                    } /* else {
                        console.error(res.statusCode);
                    } */
                    wordsRoots[word] = root;
                    cb();
                }
            );
        },
        function (err) {
            if (!err) {
                callback(null, wordsList, wordsRoots);
            } else {
                console.error(err);
            }
        }
    );
}

module.exports.getTasks = getTasks;
module.exports.getWordsAndRoots = getWordsAndRoots;
