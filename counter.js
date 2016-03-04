'use strict';

const fs = require('fs');
const request = require('request');
const http = require('http');
const async = require('async');
const natural = require('natural');
natural.PorterStemmerRu.attach();

const token = fs.readFileSync('./key.txt', 'utf-8');
const words_excl = JSON.parse(fs.readFileSync('./words.json', 'utf-8'));
const reposUrl = 'https://api.github.com/orgs/urfu-2015/repos';
const org = 'https://api.github.com/repos/urfu-2015/';

/**
 * Получает статистику встречаемости слов
 * В зависимости от метода возвращает либо топ arg слов, либо кол-во употреблений слова arg
 * @param {String} method (top или count)
 * @param {Number|String} arg Количество n, либо слово word
 * @param {Function} resultCallback
 */
function getStat(method, arg, resultCallback) {

    async.waterfall(
        [
            getRepos,
            getReadmeWords,
            calculateStat
        ]);

    /**
     * Передает в callback объект с данными о репозиториях оранизации
     * @param {Function} callback
     */
    function getRepos(callback) {
        request(getRequestOptions(reposUrl), function (err, response, body) {
            let resp;
            if (!err && response.statusCode === 200) {
                try {
                    resp = JSON.parse(body);
                    callback(null, resp);
                } catch (err) {
                    callback(err, resp);
                }
            } else {
                callback(err, resp);
            }
        });
    }

    /**
     * Передает в callback объект всех слов из текстов задач с их количеством
     * @param {Object} repos
     * @param {Function} callback
     */
    function getReadmeWords(repos, callback) {
        let words = {};
        const readmeUrls = getReadmeUrls(repos);

        // По каждой ссылке делает request, парсит readme и добавляет слова в words
        async.each(
            readmeUrls,

            (path, next) => {
                request(getRequestOptions(path), function (err, response, body) {
                    if (!err && response.statusCode === 200) {
                        const readme = new Buffer(
                            JSON.parse(body).content, 'base64').toString('utf-8');
                        const readmeWords = parseText(readme);
                        readmeWords.forEach(function (word) {
                            let lower = word.toLowerCase();
                            words[lower] = (words[lower] || 0) + 1;
                        });
                        next();
                    } else {
                        next(err);
                    }
                });
            },

            function (err) {
                callback(err, words);
            });
    }

    /**
     * Вычисляет статистику - метод top или count - и передает ее в resultCallback
     * @param {Object} words
     * @param {Function} callback
     */
    function calculateStat(words, callback) {
        let result;
        words_excl.forEach(function (word) {
            delete words[word];
        });
        delete words[''];
        const wordsArr = Object.keys(words);
        let resultObj = {};
        wordsArr.forEach(function (word) {
            const stem = word.stem();
            const amount = words[word];
            if (resultObj[stem]) {
                resultObj[stem].words.push(word);
                resultObj[stem].freq += amount;
            } else {
                resultObj[stem] = {words: [word], freq: amount};
            }
        });
        if (method === 'top') {
            result = getSortedResult(resultObj).slice(0, arg);
        } else if (method === 'count') {
            writeObj({resultObj: resultObj});
            result = getCount(resultObj, arg);
        }
        resultCallback(null, result);
    }
}

/**
 * Получает ссылки на файлы readme с текстами задач первого семестра
 * @param {Object} repos
 * @returns {Array} readmeUrls
 */
function getReadmeUrls(repos) {
    const readmeUrls = [];
    repos.forEach(function (repo) {
        const name = repo.name;
        if (name && /(javascript|verstka)-tasks/.test(name)) {
            readmeUrls.push(org + name + '/readme');
        }
    });
    return readmeUrls;
}


/**
 * Разбивает текст по неподходящим символам и возвращает список слов
 * @param {String} text
 * @returns {Array|*}
 */
function parseText(text) {
    return text.split(/[^А-Яа-яЁё]+/);
}

/**
 * Возвращает опции для запроса
 * @param url
 * @returns {{url: *, headers: {user-agent: string}, authorization}}
 */
function getRequestOptions(url) {
    return {
        url: url,
        headers: {'user-agent': 'webstorm'},
        authorization: token
    };
}

/**
 * Записывает объект с данными статистики в файл stat.json
 * @param obj
 */
function writeObj(obj) {
    fs.writeFile('./stat.json', JSON.stringify(obj), err => {
        if (err) {
            console.error(err);
        } else {
            console.log('Результаты работы сохранены на диск в файл stat.json');
        }
    });
}

/**
 * Сортирует результаты статистики по убыванию и возвращает отсортированный массив
 * @param resultObj
 * @returns {Array}
 */
function getSortedResult(resultObj) {
    let resultArr = [];
    const rootsArr = Object.keys(resultObj);
    rootsArr.forEach(function (r) {
        resultArr.push({words: resultObj[r].words, freq: resultObj[r].freq});
    });
    resultArr.sort(function (r1, r2) {
        return r2.freq - r1.freq;
    });
    writeObj({resultObj: resultObj, resultArr: resultArr});
    return resultArr;
}

/**
 * Возвращает top n слов
 * @param {Object} stat
 * @param n
 * @returns {Array}
 */
function getTop(stat, n) {
    let result;
    if (stat.resultArr) {
        result = stat.resultArr.slice(0, n);
    } else {
        result = getSortedResult(stat.resultObj).slice(0, n);
    }
    return result;
}

/**
 * Возвращает количество употреблений слова word
 * @param resultObj
 * @param word
 * @returns {*|number}
 */
function getCount(resultObj, word) {
    let root = word.stem();
    return resultObj[root].freq || 0;
}

/**
 * Возвращает топ n слов (по убыванию) из текстов задач
 * @param {Number} n
 * @param {Function} callback
 */
module.exports.top = (n, callback) => {
    fs.readFile('./stat.json', 'utf-8', (err, data) => {
        try {
            if (err) {
                throw new Error(err);
            }
            const stat = JSON.parse(data);
            const result = getTop(stat, n);
            callback(null, result);
        } catch (err) {
            getStat('top', n, callback);
        }
    });
};

/**
 * Возвращает количество слов word в текстах задач
 * @param {String} word
 * @param {Function} callback
 */
module.exports.count = (word, callback) => {
    fs.readFile('./stat.json', 'utf-8', (err, data) => {
        try {
            if (err) {
                throw new Error(err);
            }
            const stat = JSON.parse(data);
            const result = getCount(stat.resultObj, word);
            callback(null, result);
        } catch (err) {
            getStat('count', word, callback);
        }
    });
};
