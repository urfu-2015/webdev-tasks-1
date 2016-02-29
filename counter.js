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


function getStat(method, arg, resultCallback) {

    async.waterfall(
        [
            getRepos,
            getReadmeWords,
            calculateStat
        ]);

    function getRepos(callback) {
        request(getRequestOptions(reposUrl), function (err, response, body) {
            let resp;
            if (!err && response.statusCode === 200) {
                try {
                    resp = JSON.parse(body);
                } catch (err) {
                    callback(err, resp);
                }
                callback(null, resp);
            } else {
                callback(err, resp);
            }
        });
    }

    function getReadmeWords(repos, callback) {
        let words = {};
        const readmePaths = [];
        repos.forEach(function (repo) {
            const name = repo.name;
            if (name && (name.search(/(javascript|verstka)-tasks/) !== -1)) {
                readmePaths.push(org + name + '/readme');
            }
        });

        async.each(
            readmePaths,

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

    function calculateStat(words, callback) {
        let result;
        words_excl.forEach(function (word) {
            delete words[word];
        });
        delete words[''];
        const wordsArr = Object.keys(words);
        let resultObj = {};
        wordsArr.forEach(function (word) {
            let stem = word.stem();
            let amount = words[word];
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

function parseText(text) {
    return text.split(/[^А-Яа-яЁё]+/);
}

function getRequestOptions(url) {
    return {
        url: url,
        headers: {'user-agent': 'webstorm'},
        authorization: token
    };
}

function writeObj(obj) {
    fs.writeFile('./stat.json', JSON.stringify(obj), err => {
        if (err) {
            console.error(err);
        } else {
            console.log('Результаты работы сохранены на диск в файл stat.json');
        }
    });
}

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

function getTop(stat, n) {
    let result;
    if (stat.resultArr) {
        result = stat.resultArr.slice(0, n);
    } else {
        result = getSortedResult(stat.resultObj).slice(0, n);
    }
    return result;
}

function getCount(resultObj, word) {
    let root = word.stem();
    return resultObj[root].freq || 0;
}

module.exports.top = (n, callback) => {
    fs.readFile('./stat.json', 'utf-8', (err, data) => {
        if (!err) {
            try {
                const stat = JSON.parse(data);
                const result = getTop(stat, n);
                callback(null, result);
            } catch (err) {
                getStat('top', n, callback);
            }
        } else {
            getStat('top', n, callback);
        }
    });
};

module.exports.count = (word, callback) => {
    fs.readFile('./stat.json', 'utf-8', (err, data) => {
        if (!err) {
            try {
                const stat = JSON.parse(data);
                const result = getCount(stat.resultObj, word);
                callback(null, result);
            } catch (err) {
                getStat('count', word, callback);
            }
        } else {
            getStat('count', word, callback);
        }
    });
};
