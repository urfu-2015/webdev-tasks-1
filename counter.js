'use strict';
var fs = require('fs');
var oauth_token = fs.readFileSync('./key.txt', 'utf-8');
var async = require('async');
var forEach = require('async-foreach').forEach;
var request = require('request');

var GITHUB_API_URL = 'https://api.github.com';
var VNUTRISLOVA_URL = 'http://vnutrislova.net/';
var PLUS_INF = 999999;
var SHIFT_FROM_ROOT = 8;
var PARSER_STOP_SYMBOL = ']';
var DATA_FILE = 'counter-data.json';
var STOP_WORDS_FILE = 'stop.json';
var DEBUG = false;

if (process.argv.indexOf('-debug') !== -1) {
    DEBUG = true;
}

function deleteStopWords(arrayResult) {
    var stopWordsData = fs.readFileSync(STOP_WORDS_FILE);
    stopWordsData = JSON.parse(stopWordsData);
    for (var i = 0; i < arrayResult.length; i++) {
        if (stopWordsData.indexOf(arrayResult[i][0]) !== -1) {
            arrayResult[i][1] = [];
        }
    }
    return arrayResult;
}

function getCount(word, arrayResult, resultCallback) {
    /*
     Корень '' нужно пропустить,
     т.к в нем хранятся неопределенные слова
     */
    arrayResult = deleteStopWords(arrayResult);
    for (var i = 0; i < arrayResult.length; i++) {
        if (arrayResult[i][0] != '') {
            var wordsCurrentRoot = arrayResult[i][1];
            for (var j = 0; j < wordsCurrentRoot.length; j++) {
                if (word === wordsCurrentRoot[j]) {
                    resultCallback(wordsCurrentRoot.length);
                    break;
                }
            }
        }
    }
}

function getTop(count, arrayResult, resultCallback) {
    /*
     Алгоритм:
     1) ищем корень с самым большим количеством слов
     2) добавляем его и самое короткое слово с этим корнем в ответ
     3) убираем корень и слова с этим корнем из arrayResult
     4) повторяем count раз
     */
    arrayResult = deleteStopWords(arrayResult);
    var results = [];
    while (count != 0) {
        var topLength = -1;
        var nowRoot = '';
        for (var i = 0; i < arrayResult.length; i++) {
            if (arrayResult[i][0] != '' && arrayResult[i][0].length > 2) {
                var wordsCurrentRoot = arrayResult[i][1];
                if (wordsCurrentRoot.length > topLength) {
                    topLength = wordsCurrentRoot.length;
                    nowRoot = arrayResult[i][0];
                }
            }
        }
        count -= 1;
        var tempWords = [];
        for (var i = 0; i < arrayResult.length; i++) {
            if (arrayResult[i][0] === nowRoot) {
                tempWords = arrayResult[i][1];
                arrayResult[i][1] = [];
                break;
            }
        }
        var minLength = PLUS_INF;
        var resultWord = '';
        for (var j = 0; j < tempWords.length; j++) {
            if (tempWords[j].length < minLength) {
                resultWord = tempWords[j];
                minLength = tempWords[j].length;
            }
        }
        results.push([topLength, nowRoot, resultWord]);
    }
    resultCallback(results);
}

var getStats = function (word, type, resultCallback) {
    /*
     Функция формирует струтуру данных со словами и корнями и в
     зависимости от type затем вызывает getTop или getCount для парсинга
     этой структуры.
     */
    async.waterfall([
            function getRepos(callback) {
                if (DEBUG) {
                    console.log('Получение текстов репозиториев ... ');
                }
                request({
                    url: GITHUB_API_URL + '/orgs/urfu-2015/repos?access_token=' + oauth_token,
                    method: 'GET',
                    headers: {'user-agent': 'mdf-app'}
                }, function (error, response, body) {
                    var allowedRepos = [];
                    var bodyJSON = JSON.parse(body);
                    for (var repoId = 0; repoId < bodyJSON.length; repoId++) {
                        if (bodyJSON[repoId].name.indexOf('tasks') !== -1) {
                            allowedRepos.push(repoId);
                        }
                    }
                    callback(null, allowedRepos, bodyJSON);
                });
            },
            function getReadme(allowedRepos, bodyJSON, callback) {
                var result = [];
                async.eachSeries(allowedRepos, function (key, next) {
                    request({
                        url: GITHUB_API_URL + '/repos/' + bodyJSON[key].full_name +
                        '/readme?access_token=' + oauth_token,
                        method: 'GET',
                        headers: {'user-agent': 'mdf-app'}
                    }, function (errorRepo, responseRepo, bodyRepo) {
                        result.push(JSON.parse(bodyRepo));
                        next();
                    });
                }, function (err, results) {
                    callback(null, result);
                });
            },
            function getWords(bodyRepos, callback) {
                var words = [];
                async.eachSeries(bodyRepos, function (key, next) {
                    request({
                        url: key.download_url,
                        method: 'GET',
                        headers: {'user-agent': 'mdf-app'}
                    }, function (error, response, body) {
                        var currentWords = body
                            .toLowerCase()
                            .match(/[а-яА-я]+/g);
                        for (var i = 0; i < currentWords.length; i++) {
                            words.push(currentWords[i]);
                        }
                        next();
                    });
                }, function (err, results) {
                    callback(null, words);
                });
            },
            function getRoots(words, callback) {
                if (DEBUG) {
                    console.log('Слова получены. Обработка корней ...');
                }
                /*
                 Алгоритм получения корня:
                 1) находим на странице слово 'корень'
                 2) т.к. формат ответа : ... корень [кот] ...
                 пропускаем от буквы 'к' 8 символов и
                 начинаем считывать корень до ']'
                 */
                var rootObject = [];
                var wordsLength = words.length;
                var countWordsLength = 0;
                async.eachSeries(words, function (key, next) {
                    var encodeWord = encodeURI('разбор/по-составу/' + key);
                    request({
                        url: VNUTRISLOVA_URL + encodeWord,
                        method: 'GET'
                    }, function (error, response, body) {
                        var result = '';
                        if (body != undefined) {
                            var indexRoot = body.indexOf('корень');
                            if (indexRoot != -1) {
                                var startIndex = indexRoot + SHIFT_FROM_ROOT;
                                while (true) {
                                    result += body[startIndex];
                                    startIndex += 1;
                                    if (body[startIndex] === PARSER_STOP_SYMBOL) {
                                        break;
                                    }
                                }
                            } else {
                                result = '';
                            }
                        }
                        var was = false;
                        for (var i = 0; i < rootObject.length; i++) {
                            if (rootObject[i][0] === result) {
                                rootObject[i][1].push(key);
                                was = true;
                            }
                        }
                        if (was === false) {
                            rootObject.push([result, [key]]);
                        }
                        countWordsLength += 1;
                        if (DEBUG) {
                            console.log('Обрабатывается слово: ' + key +
                                '. Результат: ' + countWordsLength + ' / ' + (words.length - 1));
                        }
                        next();
                    });
                }, function (err, results) {
                    callback(null, rootObject);
                });
            }
        ],
        function (err, returnValue) {
            fs.writeFileSync('counter-data.json', JSON.stringify(returnValue));
            /*
             В returnValue теперь лежит структура слов с корнями вида:
             [
             ['кот', ['кот', 'котик', 'кот'],
             ['баб', ['бабушка', 'бабуленька'],
             ...
             ]
             В зависимости от требуемого запроса теперь
             следующие ниже вызовы функций обрабатывают эту структуру
             */
            if (type === 'count') {
                getCount(word, returnValue, resultCallback);
            }
            if (type === 'top') {
                getTop(word, returnValue, resultCallback);
            }
        });
};

module.exports.count = function (word, resultCallback) {
    if (fs.existsSync(DATA_FILE)) {
        var loadData = fs.readFileSync(DATA_FILE);
        loadData = JSON.parse(loadData);
        getCount(word, loadData, resultCallback);
    } else {
        getStats(word, 'count', resultCallback);
    }
};

module.exports.top = function (count, resultCallback) {
    if (fs.existsSync(DATA_FILE)) {
        var loadData = fs.readFileSync(DATA_FILE);
        loadData = JSON.parse(loadData);
        getTop(count, loadData, resultCallback);
    } else {
        getStats(count, 'top', resultCallback);
    }
};

