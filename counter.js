'use strict';

const http = require('http');
const fs = require('fs');
const request = require('request');
const Promise = require('bluebird');
const co = require('co');
const HashMap = require('hashmap');
const mystem = require('./index');

function main(callback) {
    return co(function* (){
        let oauth_token = yield readFile('key.txt');
        oauth_token = oauth_token.match(/^[^\n]*/)[0];

        let repos = yield sendRequest(getOptions('users/urfu-2015/repos', oauth_token, '+json'));
        repos = JSON.parse(repos)
            .map(item => item.name)
            .filter(item => /^(verstka|javascript)-tasks-\d+/i.test(item));
        let readmeText = yield Promise.all(repos.map(item => {
            return sendRequest(getOptions('repos/urfu-2015/' + item + '/readme', oauth_token,
                '.VERSION.raw'));
        }));
        readmeText = separateToSingleWords(readmeText);

        const data = yield Promise.all([
            readFile('prepositions.txt'),
            mystem.analyze(readmeText)
        ]);

        return getAllWordsFreq(data);
    })
    .then(callback)
    .catch(console.log);
}

module.exports.top = function (num) {
    return main(function (words) {
        var keys = Object.keys(words)
            .sort((a, b) => words[b] - words[a]);
        var resMap = new HashMap();
        for (var i = 0; i < num; i++) {
            resMap.set(keys[i], words[keys[i]]);
        }
        return resMap;
    });
};

module.exports.count = function (word) {
    return main(function (words) {
        return new Promise((resolve, reject) => {
            mystem.analyze(word)
            .then(item => {
                item && item.length > 0 && words[item[0]] ? resolve(words[item[0]]) :
                    reject('Sorry, your analyzed word -> ' + item + ' doesn\'t exist');
            });
        });
    });
};

function getAllWordsFreq(data) {
    const prepos = data[0].replace(/\n(?!$)/gi, '|').replace(/\|null/, '');
    const preposRegExp = new RegExp('(^|\\s)(' + prepos + ')(?=\\s|$)', 'gi');
    let allWords = data[1].join(' ')
        .replace(preposRegExp, '')
        .split(' ')
        .sort((a, b) => a > b ? 1 : -1);

    var wordsFreq = {};
    allWords.forEach(item => {
        if (!wordsFreq.hasOwnProperty(item)) {
            wordsFreq[item] = 1;
        } else {
            wordsFreq[item] += 1;
        }
    });
    return wordsFreq;
}

function separateToSingleWords(text) {
    return text.join(' ')
        .replace(/[^а-яё\s-]+/gi, '')
        .replace(/(^|[^а-яё])[а-яё](?![а-яё])/gi, '')
        .replace(/\s+/g, ' ');
}

function getOptions(query, oauth_token, accept) {
    return {
        url: 'https://api.github.com/' + query + '?access_token=' + oauth_token,
        headers: {
            'User-Agent': 'Yandex',
            'Accept': 'application/vnd.github' + accept
        }
    };
}

function sendRequest(options) {
    return new Promise((resolve, reject) => {
        request(options, (err, res, body) => {
            if (err || res.statusCode !== 200) {
                reject(err);
            }
            resolve(body);
        });
    });
}

function readFile(filePath) {
    return new Promise((resolve, reject) => {
        const stream = new fs.ReadStream(filePath, {encoding: 'utf-8'});
        var result = '';
        stream.on('readable', function () {
            result += stream.read();
        });
        stream.on('end', function () {
            resolve(result);
        });
        stream.on('error', function (err) {
            err === 'ENOENT' ? reject('File doesn\'t exist') : reject(err);
        });
    });
}
