'use strict';
const request = require('request');
const fs = require('fs');
const natural = require('natural');
const url = require('url');
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
const frequencyDict = [];
let data_analyzed = false;
const deferredAction = [];
const stopWords = JSON.parse(fs.readFileSync('stopWords.json', 'utf-8'));
const GIT_URL = 'api.github.com';

let promise = new Promise(function (resolve, reject) {
    let address = url.format({
        protocol: 'https',
        host: GIT_URL,
        pathname: '/orgs/urfu-2015/repos',
        search: '?access_token=' + OAUTH_TOKEN,
    });
    let options = {
        url: address,
        headers: {
            'User-Agent': 'request'
        }
    };
    request(options, function (error, response, body) {
        if (error || response.statusCode !== 200) {
            reject(error ? error : 'statusCode is not 200');
        }
        let repos = JSON.parse(body);
        let names = [];
        for (let i = 0; i < repos.length; i++) {
            if (repos[i].name.indexOf('verstka-tasks') !== -1 ||
                repos[i].name.indexOf('javascript-tasks') !== -1) {
                names.push(repos[i].name);
            }
        }
        let calls = 0;
        for (let i = 0; i < names.length; i++) {
            processingREADME(names[i], function (error) {
                if (error) {
                    reject(error);
                }
                if (++calls === names.length) {
                    resolve();
                }
            });
        }
    });
});

function processingREADME(name, callback) {
    let address = url.format({
        protocol: 'https',
        host: GIT_URL,
        pathname: '/repos/urfu-2015/' + name + '/readme',
        search: '?access_token=' + OAUTH_TOKEN,
    });
    let options = {
        url: address,
        headers: {
            'User-Agent': 'request'
        }
    };
    request(options, function (error, response, body) {
        if (!error && response.statusCode === 200) {
            processingText(JSON.parse(body).content);
            callback(null);
        } else {
            callback(error ? error : 'statusCode is not 200');
        }
    });
}

function processingText(encodedText) {
    let decodeText = new Buffer(encodedText, 'base64').toString();
    decodeText = decodeText
        .replace(/[^ЁёА-я \n]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase();
    let tokenizer = new natural.AggressiveTokenizerRu();
    let cleanText = [];
    decodeText = tokenizer.tokenize(decodeText);
    decodeText.forEach(function (word) {
        if (stopWords.indexOf(word) === -1) {
            cleanText.push(word);
        }
    });
    addToFrequencyArray(cleanText);
}

function addToFrequencyArray(wordArray) {
    for (let i = 0; i < wordArray.length; i++) {
        let added = false;
        let fullWord = wordArray[i];
        let stemWord = natural.PorterStemmerRu.stem(fullWord);
        for (let j = 0; j < frequencyDict.length; j++) {
            if (natural.JaroWinklerDistance(fullWord, frequencyDict[j].key) > 0.85) {
                frequencyDict[j].count += 1;
                if (frequencyDict[j].fullWords.indexOf(fullWord) === -1) {
                    frequencyDict[j].fullWords.push(fullWord);
                }
                added = true;
                break;
            }
        }
        if (added) {
            continue;
        }
        frequencyDict.push({});
        frequencyDict[frequencyDict.length - 1].key = stemWord;
        frequencyDict[frequencyDict.length - 1].count = 1;
        frequencyDict[frequencyDict.length - 1].fullWords = [fullWord];
    }
}

exports.top = function (n) {
    if (data_analyzed) {
        return new Promise(function (resolve, reject) {
            resolve(hiddenTop(n));
        });
    }
    deferredAction.push(function (i) {
        return function () {
            return hiddenTop(i);
        };
    }(n));
    return promise.then(
        result => {
            data_analyzed = true;
            while (deferredAction.length !== 0) {
                let action = deferredAction.shift();
                return action();
            }
        },
        error => console.log(error)
    );
};

exports.count = function (word) {
    if (data_analyzed) {
        return new Promise(function (resolve, reject) {
            resolve(hiddenCount(word));
        });
    }
    deferredAction.push(function (i) {
        return function () {
            return hiddenCount(i);
        };
    }(word));
    return promise.then(
        result => {
            data_analyzed = true;
            while (deferredAction.length !== 0) {
                let action = deferredAction.shift();
                return action();
            }
        },
        error => console.log(error)
    );
};

function hiddenTop(n) {
    frequencyDict.sort(compare);
    frequencyDict.reverse();
    let result = [];
    for (let i = 0; i < Math.min(n, frequencyDict.length); i++) {
        result.push(frequencyDict[i].fullWords[0] + ' ' + frequencyDict[i].count);
    };
    return result.join('\n');
}

function hiddenCount(word) {
    for (let i = 0; i < frequencyDict.length; i++) {
        if (natural.JaroWinklerDistance(word, frequencyDict[i].key) > 0.85) {
            return frequencyDict[i].count;
        }
    }
    return 'word is not found';
}

function compare(a, b) {
    if (a.count < b.count) {
        return -1;
    } else if (a.count > b.count) {
        return 1;
    } else {
        return 0;
    }
};
