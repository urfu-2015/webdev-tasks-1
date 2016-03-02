'use strict';

const request = require('request');
const fs = require('fs');
const async = require('async');
const stopWords = require('./stopWords.json');

const OATH_TOKEN = fs.readFileSync('key.txt', 'utf-8');
const GITHUB_API = 'https://api.github.com';
const PARSE_WORD_SERVICE = 'http://vnutrislova.net/' + encodeURI('разбор/по-составу/');
const REGEXP = /[^а-яё]+/g;

module.exports.top = function (n) {
    getStatistics(n, 'top');
};

module.exports.count = function (word) {
    getStatistics(word, 'count');
};

/**
 * Основная функция, выполняющая запросы к Github,
 * к сервису разбора слов по составу, и проводящая анализ данных
 *
 * @param req number|word
 * @param type top|count тип запроса
 */
function getStatistics(req, type) {
    async.waterfall([
            getRepos,
            getAllReadme,
            splitAllContent,
            countStatistics
        ],
        /**
         * Основной callback
         *
         * @param err
         * @param countRepetitions
         * @param wordsRoots
         */
        function (err, countRepetitions, wordsRoots) {
            if (err) {
                console.error(err);
            }
            if (type === 'top') {
                showTop(req, countRepetitions);
            } else {
                showCount(req, countRepetitions, wordsRoots);
            }
        });
}

/**
 * функция, выполняющая запрос к GitHub,
 * и передающая в callback все репазитории urfu-2015
 *
 * @param callback
 */
function getRepos(callback) {
    request({
            url: GITHUB_API + '/orgs/urfu-2015/repos?access_token=' + OATH_TOKEN,
            method: 'GET',
            headers: {'User-Agent': 'Webdev homework 1.0.0'}
        },
        function (err, res, body) {
            if (!err && res.statusCode === 200) {
                var reposList = JSON.parse(body);
                callback(err, reposList.map(function (repos) {
                    return repos.full_name;
                }));
            } else {
                callback(err);
            }
        }
    );
}

/**
 * Функция, собирающая все файлы readme из репазиториев
 *
 * @param reposList
 * @param callback
 */
function getAllReadme(reposList, callback) {
    var reposContent = '';
    reposList = reposList.filter(function (repos) {
        return repos.indexOf('tasks') !== -1;
    });

    var promisifiedReposContent = reposList.map(function (repos) {
        return new Promise(function (resolve, rejected) {
            var promiseCallback = function (error) {
                if (error) {
                    rejected(error);
                } else {
                    resolve();
                }
            };

            request({
                    url: GITHUB_API + '/repos/' + repos + '/readme?access_token=' + OATH_TOKEN,
                    method: 'GET',
                    headers: {'User-Agent': 'Webdev homework 1.0.0'}
                },
                function (err, res, body) {
                    if (!err && res.statusCode === 200) {
                        var parsedBody = JSON.parse(body);
                        reposContent += ' ' + (new Buffer(parsedBody.content, parsedBody.encoding)
                                .toString('utf-8'));
                    }
                    promiseCallback(err);
                }
            );
        });
    });

    Promise.all(promisifiedReposContent)
        .then(function () {
            callback(null, reposContent);
        })
        .catch(function (err) {
            callback(err);
        });
}

/**
 * Функция - парсер, оставляет только русские слова, без предлогов,
 * союзов и знаков препинания
 *
 * @param reposContent
 * @param callback
 */
function splitAllContent(reposContent, callback) {
    reposContent = reposContent.toLowerCase().split(REGEXP);
    callback(null, reposContent.filter(function (word) {
        return stopWords.indexOf(word) === -1 && word !== '';
    }));
}

/**
 * Функция, вычисляющая корни слов, и производящая подсчет повторений слов
 *
 * @param reposContent
 * @param callback
 */
function countStatistics(reposContent, callback) {
    // wordsRoots - для каждого слова хранится его корень
    var wordsRoots = {};
    /* countRepetitions[root] {root, count, word} - структура,
     для хранения повторений.
     count - число повторений, word - первое слово с этим коренм.
     Его выведем в статистику
     */
    var countRepetitions = {};
    const wordParts = 'Возможный состав слова: ';
    const endSubstrWithRoot = 'альтернативные варианты';

    var promisifiedWords = reposContent.map(function (currentWord) {
        return new Promise(function (resolve, rejected) {
            var promiseCallback = function (error) {
                if (error) {
                    rejected(error);
                } else {
                    resolve();
                }
            };

            request({
                    url: PARSE_WORD_SERVICE + encodeURI(currentWord),
                    method: 'GET'
                },
                function (err, res, body) {
                    var rootIndex = -1;
                    var currentRoot = currentWord;
                    if (!err && res.statusCode === 200) {
                        var substrWithRoot = body.slice(body.indexOf(wordParts),
                            body.indexOf(endSubstrWithRoot)).split(' ');
                        rootIndex = substrWithRoot.indexOf('корень');
                        if (rootIndex !== -1) {
                            currentRoot = substrWithRoot[rootIndex + 1].replace(REGEXP, '');
                        }
                    }
                    if (wordsRoots[currentWord] === undefined) {
                        wordsRoots[currentWord] = currentRoot;
                    }
                    if (countRepetitions[currentRoot] === undefined) {
                        countRepetitions[currentRoot] = {root: currentRoot,
                                count: 0, word: currentWord};
                    }
                    countRepetitions[currentRoot].count += 1;
                    promiseCallback(err);
                });
        });
    });

    Promise.all(promisifiedWords)
        .then(function () {
            callback(null, countRepetitions, wordsRoots);
        })
        .catch(function (err) {
            callback(err);
        });
}

/**
 * Вспомогательная функция, для сортировки
 *
 * @param a
 * @param b
 * @returns {number}
 */
function compareRepetitions(a, b) {
    if (a.count > b.count) {
        return -1;
    }
    if (a.count < b.count) {
        return 1;
    }
}

/**
 * Функция вывода n первых слов
 *
 * @param count
 * @param countRepetitions
 */
function showTop(count, countRepetitions) {
    var sortedCount = [];
    for (var el in countRepetitions) {
        sortedCount.push(countRepetitions[el]);
    }
    sortedCount.sort(compareRepetitions);
    count = count > sortedCount.length ? sortedCount.length : count;
    //var writer = fs.
    //    createWriteStream('Stat.txt')
    //    .on('finish', function() {
    //        console.log('Success');
    //    });
    for (var i = 0; i < count; i++) {
        process.stdout.write(sortedCount[i].word + ' ' + sortedCount[i].count + '\n');
        //writer.write(sortedCount[i].word + ' ' + sortedCount[i].count + '\n');
    }
    //writer.end();
}

/**
 * Функция вывода повторений слова word
 *
 * @param word
 * @param countRepetitions
 * @param wordsRoots
 */
function showCount(word, countRepetitions, wordsRoots) {
    if (wordsRoots[word] === undefined) {
        process.stdout.write(word + ' ' + '0\n');
    } else {
        process.stdout.write(word + ' ' + countRepetitions[wordsRoots[word]].count.toString());
    }
}
