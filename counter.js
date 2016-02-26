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

    async.forEach(reposList, function (repos, next) {
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
                    next();
                }
            }
        );
    }, function (err) {
        callback(null, reposContent);
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
    async.eachSeries(reposContent, function (word, next) {
        request({
                url: PARSE_WORD_SERVICE + encodeURI(word),
                method: 'GET'
            },
            function (err, res, body) {
                var rootIndex = -1;
                var currentRoot = word;
                if (!err && res.statusCode === 200) {
                    body = body.split(' ');
                    rootIndex = body.indexOf('корень');
                    if (rootIndex !== -1) {
                        currentRoot = body[rootIndex + 1].replace(REGEXP, '');
                    }
                }
                if (wordsRoots[word] === undefined) {
                    if (countRepetitions[currentRoot] === undefined) {
                        countRepetitions[currentRoot] =
                        {root: currentRoot, count: 0, word: word};
                    }
                    wordsRoots[word] = currentRoot;
                }
                countRepetitions[currentRoot].count += 1;
                next();
            });
    }, function (err) {
        if (err) {
            callback(err);
        } else {
            callback(null, countRepetitions, wordsRoots);
        }
    });
}

/**
 * Вспомогательная функция, для сортировки
 *
 * @param a
 * @param b
 * @returns {number}
 */
function compare(a, b) {
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
    sortedCount.sort(compare);
    count = count > sortedCount.length ? sortedCount.length : count;
    //var writer = fs.
    //    createWriteStream('Statistics.txt')
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
        process.stdout.write(0);
    } else {
        process.stdout.write(countRepetitions[wordsRoots[word]].count);
    }
}
