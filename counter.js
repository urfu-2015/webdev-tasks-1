'use strict';
const request = require('request');
const fs = require('fs');
const natural = require('natural');
const url = require('url');
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
const frequencyDict = [];
const deferredAction = [];
const stopWords = JSON.parse(fs.readFileSync('stopWords.json', 'utf-8'));
const GIT_URL = 'api.github.com';

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

let promise = new Promise((resolve, reject) => {
    request(options, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            reject(error || 'statusCode is not 200');
        }
        let repos = JSON.parse(body);
        let promises = [];
        for (let i = 0; i < repos.length; i++) {
            let reposName = repos[i].name;
            if (isAppropriateRepos(reposName)) {
                promises.push(processingREADME(reposName));
            }
        }
        Promise.all(promises).then(
            allTexts => {
                processingText(allTexts);
                resolve()
            },
            error => reject(error)
        );
    });
});

function isAppropriateRepos(reposName) {
    return reposName.indexOf('verstka-tasks') !== -1 ||
            reposName.indexOf('javascript-tasks') !== -1;
}

function processingREADME(name) {
    let options = {
        url: urlForReadme(name),
        headers: {
            'User-Agent': 'request'
        }
    };
    return new Promise((resolve,reject) => {
        request(options, (error, response, body) => {
            if (!error && response.statusCode === 200) {
                resolve(JSON.parse(body).content);
            } else {
                reject(error || 'statusCode is not 200');
            }
        });
    });   
}

function urlForReadme(reposName) {
    return url.format({
        protocol: 'https',
        host: GIT_URL,
        pathname: '/repos/urfu-2015/' + reposName + '/readme',
        search: '?access_token=' + OAUTH_TOKEN,
    });
}

function processingText(encodedTexts) {
    let decodeText = '';
    for (let i = 0; i<encodedTexts.length; i++) {
        decodeText += new Buffer(encodedTexts[i], 'base64').toString();
    }
    decodeText = decodeText
        .replace(/[^ЁёА-я \n]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ');
    let cleanText = [];
    decodeText.forEach((word) => {
        if (stopWords.indexOf(word) === -1) {
            cleanText.push(word);
        }
    });
    addToFrequencyArray(cleanText);
}


let Word = function (root, fullWord) {
    this.root = root;
    this.fullWord = fullWord;
    this.count = 1;
    this.toString = () =>
        this.fullWord + ' ' + this.count;
};

function isCognates(word1, word2) {
    return natural.JaroWinklerDistance(word1, word2) >  0.85;
}

function addToFrequencyArray(wordArray) {
    for (let i = 0; i < wordArray.length; i++) {
        let isRootExist = false;
        let fullWord = wordArray[i];
        let stemWord = natural.PorterStemmerRu.stem(fullWord);
        for (let j = 0; j < frequencyDict.length; j++) {
            if (isCognates(fullWord, frequencyDict[j].root))
            {
                frequencyDict[j].count++;
                isRootExist = true;
                break;
            }
        };
        if (!isRootExist) {
            frequencyDict.push(new Word(stemWord, fullWord));
        }        
    }
}

exports.top = (n) => generateFunction(hiddenTop, n);

exports.count = (word) => generateFunction(hiddenCount, word);

function generateFunction(callback, arg) {
    deferredAction.push(function (i) {
        return () => callback(i);
    }(arg));
    return promise.then(
        text => {
            while (deferredAction.length !== 0) {
                let action = deferredAction.shift();
                return action();
            }
        },
        error => console.log(error)
    );
}

function hiddenTop(n) {
    frequencyDict.sort(compare).reverse();
    let result = [];
    for (let i = 0, length = Math.min(n, frequencyDict.length); i < length; i++) {
        result.push(frequencyDict[i]);
    };
    return result.join('\n');
}

function hiddenCount(word) {
    for (let i = 0; i < frequencyDict.length; i++) {
        if (isCognates(word, frequencyDict[i].root)) {
            return frequencyDict[i].count;
        }
    }
    return 'word is not found';
}

function compare(a, b) {
    return a.count - b.count;
};
