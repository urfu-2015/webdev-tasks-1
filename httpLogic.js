const async = require('async');
const asyncRequest = require('request');
const config = require('./config');

/**
 * Функция создаём массив из адресов репозиториев, которые мы будем выкачивать.
 * @param {Array} prefixes
 * @returns {Array} repos
 */
function getRepos(prefixes) {
    var URI;

    var repos = [];

    for (var i = 1; i <= config.configObj.numberTasks; i++) {
        prefixes.forEach(function (prefix) {
            URI = `${config.configObj.gitHubApi}/repos/${config.configObj.mainRepo}/` +
                  `${prefix}${i}/readme/?access_token=${config.configObj.key}`;
            repos.push(URI);
        });
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
    var parsedRes;

    try {
        parsedRes = JSON.parse(res);
        parsedContent = new Buffer(parsedRes.content, parsedRes.encoding).toString('utf-8');
    } catch (err) {
        console.error(err);
    }

    return parsedContent;
}

/**
 * Функция, которая асинхронно получает тексты README.md, в зависимости от префикса тасков.
 * @param {Array} prefixes
 * @param {Function} callback
 */
function getTasks(prefixes, callback) {
    var responses = [];

    async.each(getRepos(prefixes),
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
                    }
                    cb();
                }
            );
        },
        function (err) {
            if (!err) {
                var parsedAPIResponses = responses.map(function (item) {
                    return parseAPIResponse(item);
                });
                callback(null, parsedAPIResponses);
            } else {
                callback(err, null);
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
            URI = `${config.configObj.onlineDictHost}${config.configObj.onlineDictPath}${word}`;
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
                        if (config.configObj.rootRegExp.exec(body) !== null) {
                            root = config.configObj.rootRegExp.exec(body)[1];
                        }
                    }
                    wordsRoots[word] = root;
                    cb();
                }
            );
        },
        function (err) {
            if (!err) {
                callback(null, wordsList, wordsRoots);
            } else {
                callback(err, null, null);
            }
        }
    );
}

module.exports.getTasks = getTasks;
module.exports.getWordsAndRoots = getWordsAndRoots;
