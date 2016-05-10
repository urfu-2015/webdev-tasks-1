'use strict';

const fs = require('fs');
const request = require('request');
const token = fs.readFileSync('./key.txt', 'utf-8');
const userReposUrl = 'https://api.github.com/orgs/urfu-2015/repos?access_token=' + token;
const buffer = require('buffer');
const natural = require('natural');
const stopwords = require('./stopwords').words;

var isDictionaryCreated = false;
var counter = 0;
var dictionary = {};

var sendRequest = (header, callback) => {
    request(header, (err, res, body) => {
        if (err) {
            throw new Error(err);
        };
        if (res.statusCode !== 200) {
            console.log(`Finished with ${res.statusCode}`);
            return;
        } else {
            let data = JSON.parse(body);
            callback(data);
        };
    });
};

var createDictionary = (callback) => {
    sendRequest(getHeader(userReposUrl), (repositories) => {
        var repos = [];
        repositories.forEach((repo, repoIndex, repositories) => {
            if (isRepoWithReadme(repo.name)) {
                let repoUrl = `https://api.github.com/repos/urfu-2015/${repo.name}/` +
                `readme?access_token=${token}`;
                getReadmeText(repoUrl, () => {
                    if (counter == 20) {
                        isDictionaryCreated = true;
                        callback();
                    }
                });
            }
        });
    });
};

var getReadmeText = (repoUrl, callback) => {
    sendRequest(getHeader(repoUrl), (data) => {
        let readmeBuffer = new Buffer(data.content, 'base64').toString('utf-8').toLowerCase();
        getFrequency(readmeBuffer, () => {
            counter++;
        });
        callback();
    });
};

var getFrequency = (readme, callback) => {
    let words = readme.replace(/[^а-яёА-ЯЁ]+/g, ' ').split(' ').filter((word) => {
        return word.length > 0;
    }).filter((word) => {
        return stopwords.indexOf(word) === -1;
    }).map((word) => {
        return natural.PorterStemmerRu.stem(word);
    });
    words.forEach((word, index, words) => {
        if (dictionary[word] !== undefined) {
            dictionary[word]++;
        } else {
            dictionary[word] = 1;
        }
    });
    callback();
};

var sortKeys = (count) => {
    let keys = Object.keys(dictionary);
    keys.sort((a, b) => {
        return dictionary[b] - dictionary[a];
    });
    for (var i = 0; i < count; i++) {
        let answerString = `Слово ${keys[i]} встречается ${dictionary[keys[i]]} раз`;
        console.log(answerString);
    }
};

var isRepoWithReadme = (repoName) => {
    if (repoName.indexOf('verstka-tasks-') != -1 || repoName.indexOf('javascript-tasks-') != -1) {
        return repoName;
    }
};

var getHeader = (url) => {
    return {
        method: 'GET',
        url: url,
        headers: {
            'User-Agent': 'request'
        }
    };
};

module.exports.count = (word) => {
    let wordStemp = natural.PorterStemmerRu.stem(word);
    if (!isDictionaryCreated) {
        createDictionary(() => {
            console.log(dictionary[wordStemp]);
        });
    } else {
        console.log(dictionary[wordStemp]);
    }
};

module.exports.top = (count) => {
    if (!isDictionaryCreated) {
        createDictionary(sortKeys.bind(null, count));
    } else {
        sortKeys(count);
    };
};

module.exports.count('вы');
