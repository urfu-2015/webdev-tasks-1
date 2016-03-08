'use strict';

const http = require('http');
const fs = require('fs');
const request = require('request');
const Promise = require('bluebird');
const co = require('co');
const url = require('url');
const mystem = require('./index');

function* main() {
    let oauthToken = yield readFile('key.txt');
    oauthToken = oauthToken.split('\n').shift();

    let repos = yield sendRequest('users/urfu-2015/repos', oauthToken, '+json');
    repos = JSON.parse(repos.pop())
        .map(item => item.name)
        .filter(item => /^(verstka|javascript)-tasks-\d+/i.test(item));
    let readmeText = yield Promise.all(repos.map(item => {
        return sendRequest('repos/urfu-2015/' + item + '/readme', oauthToken, '.VERSION.raw');
    }));
    readmeText = separateToSingleWords(readmeText);

    const data = yield [
        readFile('prepositions.txt'),
        mystem.analyze(readmeText)
    ];

    return getAllWordsFreq(data);
}

module.exports.top = function (num) {
    return co(function* () {
        const words = yield main();
        const keys = Object.keys(words)
            .sort((a, b) => words[b] - words[a]);

        let result = {};
        for (var i = 0; i < num; i++) {
            result[keys[i]] = words[keys[i]];
        }

        return result;
    });
};

module.exports.count = function (word) {
    return co(function* () {
        const words = yield main();
        const stemWord = yield mystem.analyze(word);
        if (stemWord && stemWord.length > 0 && words[stemWord[0]]) {
            return words[stemWord[0]];
        }
        throw('Sorry, your analyzed word -> ' + stemWord + ' doesn\'t exist');
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
        .replace(/\s+/g, ' ');
}

function getOptions(query, oauthToken, accept) {
    const requestedUrl = {
        protocol: 'https',
        host: 'api.github.com',
        pathname: query,
        search: 'access_token=' + oauthToken
    };
    return {
        url: url.format(requestedUrl),
        headers: {
            'User-Agent': 'mystem',
            'Accept': 'application/vnd.github' + accept
        }
    };
}

function sendRequest(query, oauthToken, accept) {
    const options = getOptions(query, oauthToken, accept);
    return Promise.promisify(request)(options);
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
