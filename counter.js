'use strict';

const request = require('request');
const fs = require('fs');
const async = require('async');
const stopWords = require('./stopWords.json');

const OATH_TOKEN = fs.readFileSync('key.txt', 'utf-8');
const GITHUB_API = 'https://api.github.com';
<<<<<<< HEAD
var GET_ROOT_SITE = 'http://vnutrislova.net/' + encodeURI('ðàçáîð/ïî-ñîñòàâó/');
var REGEXP = /[^À-ßà-ÿ¸¨]+/g;
=======
var GET_ROOT_SITE = 'http://vnutrislova.net/' + encodeURI('Ñ€Ð°Ð·Ð±Ð¾Ñ€/Ð¿Ð¾-ÑÐ¾ÑÑ‚Ð°Ð²Ñƒ/');
var REGEXP = /[^Ð-Ð¯Ð°-ÑÑ‘Ð]+/g;
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
const stopRepos = ['urfu-2015/verstka-lectures', 'urfu-2015/javascript-lectures',
    'urfu-2015/guides', 'urfu-2015/javascript-slides',
    'urfu-2015/verstka-slides', 'urfu-2015/html-test-suite', 'urfu-2015/rebase-example-repo',
    'urfu-2015/hrundel-board', 'urfu-2015/webdev-lectures', 'urfu-2015/webdev-slides'];

module.exports.top = function (n) {
    getStatistics(n, 'top');
};

module.exports.count = function (word) {
    getStatistics(word, 'count');
};

/**
<<<<<<< HEAD
 * Îñíàâíàÿ ôóíêöèÿ, âûïîëíÿþùàÿ çàïðîñû ê Github,
 * ê ñåðâèñó ðàçáîðà ñëîâ ïî ñîñòàâó, è ïðîâîäÿùàÿ àíàëèç äàííûõ
 *
 * @param req number|word
 * @param type top|count òèï çàïðîñà
=======
 * ÐžÑÐ½Ð°Ð²Ð½Ð°Ñ Ñ„ÑƒÐ½ÐºÑ†Ð¸Ñ, Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÑŽÑ‰Ð°Ñ Ð·Ð°Ð¿Ñ€Ð¾ÑÑ‹ Ðº Github,
 * Ðº ÑÐµÑ€Ð²Ð¸ÑÑƒ Ñ€Ð°Ð·Ð±Ð¾Ñ€Ð° ÑÐ»Ð¾Ð² Ð¿Ð¾ ÑÐ¾ÑÑ‚Ð°Ð²Ñƒ, Ð¸ Ð¿Ñ€Ð¾Ð²Ð¾Ð´ÑÑ‰Ð°Ñ Ð°Ð½Ð°Ð»Ð¸Ð· Ð´Ð°Ð½Ð½Ñ‹Ñ…
 *
 * @param req number|word
 * @param type top|count Ñ‚Ð¸Ð¿ Ð·Ð°Ð¿Ñ€Ð¾ÑÐ°
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
 */
function getStatistics(req, type) {
    async.waterfall([
            /**
<<<<<<< HEAD
             * ôóíêöèÿ, âûïîëíÿþùàÿ çàïðîñ ê GitHub,
             * è ïåðåäàþùàÿ â callback âñå ðåïàçèòîðèè urfu-2015
=======
             * Ñ„ÑƒÐ½ÐºÑ†Ð¸Ñ, Ð²Ñ‹Ð¿Ð¾Ð»Ð½ÑÑŽÑ‰Ð°Ñ Ð·Ð°Ð¿Ñ€Ð¾Ñ Ðº GitHub,
             * Ð¸ Ð¿ÐµÑ€ÐµÐ´Ð°ÑŽÑ‰Ð°Ñ Ð² callback Ð²ÑÐµ Ñ€ÐµÐ¿Ð°Ð·Ð¸Ñ‚Ð¾Ñ€Ð¸Ð¸ urfu-2015
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
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
            },
            /**
<<<<<<< HEAD
             * Ôóíêöèÿ, ñîáèðàþùàÿ âñå ôàéëû readme èç ðåïàçèòîðèåâ
=======
             * Ð¤ÑƒÐ½ÐºÑ†Ð¸Ñ, ÑÐ¾Ð±Ð¸Ñ€Ð°ÑŽÑ‰Ð°Ñ Ð²ÑÐµ Ñ„Ð°Ð¹Ð»Ñ‹ readme Ð¸Ð· Ñ€ÐµÐ¿Ð°Ð·Ð¸Ñ‚Ð¾Ñ€Ð¸ÐµÐ²
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
             *
             * @param reposList
             * @param callback
             */
                function getAllReadme(reposList, callback) {
                var reposContent = '';
                reposList = reposList.filter(function (repos) {
                    return stopRepos.indexOf(repos) === -1;
                });

                async.forEach(reposList, function (repos, next) {
                    request({
                            url: GITHUB_API + '/repos/' + repos +
<<<<<<< HEAD
                            '/readme?access_token=' + OATH_TOKEN,
=======
                                        '/readme?access_token=' + OATH_TOKEN,
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
                            method: 'GET',
                            headers: {'User-Agent': 'Webdev homework 1.0.0'}
                        },
                        function (err, res, body) {
                            if (!err && res.statusCode === 200) {
                                var parsedBody = JSON.parse(body);
                                reposContent += ' ' + (new Buffer(parsedBody.content,
<<<<<<< HEAD
                                        parsedBody.encoding).toString('utf-8'));
=======
                                                    parsedBody.encoding).toString('utf-8'));
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
                                next();
                            }
                        }
                    );
                }, function (err, content) {
                    callback(null, reposContent);
                });
            },
            /**
<<<<<<< HEAD
             * Ôóíêöèÿ - ïàðñåð, îñòàâëÿåò òîëüêî ðóññêèå ñëîâà, áåç ïðåäëîãîâ,
             * ñîþçîâ è çíàêîâ ïðåïèíàíèÿ
=======
             * Ð¤ÑƒÐ½ÐºÑ†Ð¸Ñ - Ð¿Ð°Ñ€ÑÐµÑ€, Ð¾ÑÑ‚Ð°Ð²Ð»ÑÐµÑ‚ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ€ÑƒÑÑÐºÐ¸Ðµ ÑÐ»Ð¾Ð²Ð°, Ð±ÐµÐ· Ð¿Ñ€ÐµÐ´Ð»Ð¾Ð³Ð¾Ð²,
             * ÑÐ¾ÑŽÐ·Ð¾Ð² Ð¸ Ð·Ð½Ð°ÐºÐ¾Ð² Ð¿Ñ€ÐµÐ¿Ð¸Ð½Ð°Ð½Ð¸Ñ
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
             *
             * @param reposContent
             * @param callback
             */
                function splitAllContent(reposContent, callback) {
                reposContent = reposContent.toLowerCase().split(REGEXP);
                callback(null, reposContent);
            },
            /**
<<<<<<< HEAD
             * Ôóíêöèÿ, âû÷èñëÿþùàÿ êîðíè ñëîâ, è ïðîèçâîäÿùàÿ ïîäñ÷åò ïîâòîðåíèé ñëîâ
=======
             * Ð¤ÑƒÐ½ÐºÑ†Ð¸Ñ, Ð²Ñ‹Ñ‡Ð¸ÑÐ»ÑÑŽÑ‰Ð°Ñ ÐºÐ¾Ñ€Ð½Ð¸ ÑÐ»Ð¾Ð², Ð¸ Ð¿Ñ€Ð¾Ð¸Ð·Ð²Ð¾Ð´ÑÑ‰Ð°Ñ Ð¿Ð¾Ð´ÑÑ‡ÐµÑ‚ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÐµÐ½Ð¸Ð¹ ÑÐ»Ð¾Ð²
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
             *
             * @param reposContent
             * @param callback
             */
                function doCount(reposContent, callback) {
<<<<<<< HEAD
                // wordsRoots - äëÿ êàæäîãî ñëîâà õðàíèòñÿ åãî êîðåíü
                var wordsRoots = {};
                /* countRepetitions[root] {root, count, word} - ñòðóêòóðà, äëÿ õðàíåíèÿ ïîâòîðåíèé.
                 count - ÷èñëî ïîâòîðåíèé, word - ïåðâîå ñëîâî ñ ýòèì êîðåíì.
                 Åãî âûâåäåì â ñòàòèñòèêó
                 */
=======
                // wordsRoots - Ð´Ð»Ñ ÐºÐ°Ð¶Ð´Ð¾Ð³Ð¾ ÑÐ»Ð¾Ð²Ð° Ñ…Ñ€Ð°Ð½Ð¸Ñ‚ÑÑ ÐµÐ³Ð¾ ÐºÐ¾Ñ€ÐµÐ½ÑŒ
                var wordsRoots = {};
                /* countRepetitions[root] {root, count, word} - ÑÑ‚Ñ€ÑƒÐºÑ‚ÑƒÑ€Ð°, Ð´Ð»Ñ Ñ…Ñ€Ð°Ð½ÐµÐ½Ð¸Ñ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÐµÐ½Ð¸Ð¹.
                    count - Ñ‡Ð¸ÑÐ»Ð¾ Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÐµÐ½Ð¸Ð¹, word - Ð¿ÐµÑ€Ð²Ð¾Ðµ ÑÐ»Ð¾Ð²Ð¾ Ñ ÑÑ‚Ð¸Ð¼ ÐºÐ¾Ñ€ÐµÐ½Ð¼.
                    Ð•Ð³Ð¾ Ð²Ñ‹Ð²ÐµÐ´ÐµÐ¼ Ð² ÑÑ‚Ð°Ñ‚Ð¸ÑÑ‚Ð¸ÐºÑƒ
                */
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
                var countRepetitions = {};
                async.eachSeries(reposContent, function (word, next) {
                    request({
                            url: GET_ROOT_SITE + encodeURI(word),
                            method: 'GET'
                        },
                        function (err, res, body) {
                            if (stopWords.indexOf(word) === -1 && word !== '') {
                                if (!err && res.statusCode === 200) {
                                    body = body.split(' ');
<<<<<<< HEAD
                                    var rootIndex = body.indexOf('êîðåíü');
                                    if (rootIndex !== -1) {
                                        if (wordsRoots[word] === undefined) {
                                            var currentRoot = body[rootIndex + 1].
                                                replace(REGEXP, '');
                                            if (countRepetitions[currentRoot] === undefined) {
                                                countRepetitions[currentRoot] =
                                                {'root': currentRoot, 'count': 0, 'word': word};
=======
                                    var rootIndex = body.indexOf('ÐºÐ¾Ñ€ÐµÐ½ÑŒ');
                                    if (rootIndex !== -1) {
                                        if (wordsRoots[word] === undefined) {
                                            var currentRoot = body[rootIndex + 1].
                                                                        replace(REGEXP, '');
                                            if (countRepetitions[currentRoot] === undefined) {
                                                countRepetitions[currentRoot] =
                                                    {'root': currentRoot, 'count': 0, 'word': word};
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
                                            }
                                            wordsRoots[word] = currentRoot;
                                        }
                                    }
                                }
                                if (wordsRoots[word] === undefined) {
                                    if (countRepetitions[word] === undefined) {
                                        countRepetitions[word] = { 'root': word, 'count': 0,
                                            'word': word};
                                    }
                                    wordsRoots[word] = word;
                                }
                                countRepetitions[wordsRoots[word]].count += 1;
                            }
                            next();
                        }
                    );
                }, function (err) {
                    callback(null, countRepetitions, wordsRoots);
                });
            }
        ],
        /**
<<<<<<< HEAD
         * Îñíîâíîé callback
=======
         * ÐžÑÐ½Ð¾Ð²Ð½Ð¾Ð¹ callback
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
         *
         * @param err
         * @param countRepetitions
         * @param wordsRoots
         */
        function (err, countRepetitions, wordsRoots) {
            if (type === 'top') {
                getTop(req, countRepetitions);
            } else {
                getCount(req, countRepetitions, wordsRoots);

            }
        });
}

/**
<<<<<<< HEAD
 * Âñïîìîãàòåëüíàÿ ôóíêöèÿ, äëÿ ñîðòèðîâêè
=======
 * Ð’ÑÐ¿Ð¾Ð¼Ð¾Ð³Ð°Ñ‚ÐµÐ»ÑŒÐ½Ð°Ñ Ñ„ÑƒÐ½ÐºÑ†Ð¸Ñ, Ð´Ð»Ñ ÑÐ¾Ñ€Ñ‚Ð¸Ñ€Ð¾Ð²ÐºÐ¸
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
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
<<<<<<< HEAD
 * Ôóíêöèÿ âûâîäà n ïåðâûõ ñëîâ
=======
 * Ð¤ÑƒÐ½ÐºÑ†Ð¸Ñ Ð²Ñ‹Ð²Ð¾Ð´Ð° n Ð¿ÐµÑ€Ð²Ñ‹Ñ… ÑÐ»Ð¾Ð²
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
 *
 * @param count
 * @param countRepetitions
 */
function getTop(count, countRepetitions) {
    var sortedCount = [];
    for (var el in countRepetitions) {
        sortedCount.push(countRepetitions[el]);
    }
    sortedCount.sort(compare);
    count = count > sortedCount.length ? sortedCount.length : count;
    for (var i = 0; i < count; i++) {
        process.stdout.write(sortedCount[i].word + ' ' + sortedCount[i].count + '\n');
    }
}

/**
<<<<<<< HEAD
 * Ôóíêöèÿ âûâîäà ïîâòîðåíèé ñëîâà word
=======
 * Ð¤ÑƒÐ½ÐºÑ†Ð¸Ñ Ð²Ñ‹Ð²Ð¾Ð´Ð° Ð¿Ð¾Ð²Ñ‚Ð¾Ñ€ÐµÐ½Ð¸Ð¹ ÑÐ»Ð¾Ð²Ð° word
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
 *
 * @param word
 * @param countRepetitions
 * @param wordsRoots
 */
function getCount(word, countRepetitions, wordsRoots) {
    if (wordsRoots[word] === undefined) {
        process.stdout.write(0);
    } else {
        process.stdout.write(countRepetitions[wordsRoots[word]].count);
    }
<<<<<<< HEAD
}/**
 * Created by mv on 23.02.2016.
 */
=======
}
>>>>>>> 23d04564dcb92aff99527aaf2b8c1bf449b0502c
