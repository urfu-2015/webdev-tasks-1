'use strict';
const rp = require('request-promise');
const fs = require('fs');
const natural = require('natural');
const url = require('url');
const OAUTH_TOKEN = fs.readFileSync('./key.txt', 'utf-8');
const frequencyDict = [];
const deferredAction = [];
const stopWords = JSON.parse(fs.readFileSync('stopWords.json', 'utf-8'));
const GIT_URL = 'api.github.com';

exports.top = (n) => generateFunction(hiddenTop, n);

exports.count = (word) => generateFunction(hiddenCount, word);

let address = url.format({
    protocol: 'https',
    host: GIT_URL,
    pathname: '/orgs/urfu-2015/repos',
    search: '?access_token=' + OAUTH_TOKEN,
});
let options = {
    uri: address,
    headers: {
        'User-Agent': 'request'
    },
    transform: promisesFromBody
};
let promise = rp(options).then(
    promises => Promise.all(promises).then(
        allTexts =>
            processingText(allTexts),
        handleError
    ),
    handleError
);

function promisesFromBody(body) {
    let repos = JSON.parse(body);
    return repos.reduce((promises, rep) => {
        if (isAppropriateRepos(rep.name)) {
            promises.push(processingREADME(rep.name));
        }
        return promises;
    }, []);
}

function handleError(error) {
    console.log(error);
}

function isAppropriateRepos(reposName) {
    return reposName.indexOf('verstka-tasks') !== -1 ||
        reposName.indexOf('javascript-tasks') !== -1;
}

function processingREADME(name) {
    let options = {
        uri: urlForReadme(name),
        headers: {
            'User-Agent': 'request'
        },
        transform: (body) =>
            JSON.parse(body).content
    };
    return rp(options);  
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
    let decodeText = encodedTexts.reduce((decodeText, text) => {
        return decodeText += new Buffer(text, 'base64').toString();
    }, '');
    decodeText = decodeText
        .replace(/[^ЁёА-я \n]/g, '')
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .split(' ');
    let cleanText = decodeText.reduce((cleanText, word) => {
        if (stopWords.indexOf(word) === -1) {
            cleanText.push(word);
        }
        return cleanText;
    }, [])
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
    return natural.JaroWinklerDistance(word1, word2) > 0.85;
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
