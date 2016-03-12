'use strict';
const fs = require('fs');
const natural = require('natural');
const disallowedWords = ['при', 'на', 'в', 'к', 'без', 'до', 'из', 'по', 'о', 'от',
    'перед', 'через', 'с', 'у', 'за', 'над', 'об', 'под', 'про', 'для', 'и', 'но',
    'а', 'или', 'не', 'же', 'это', 'как', 'если', 'вы', 'он', 'они', 'я', 'мы'];
const reposNames = ['verstka-tasks-', 'javascript-tasks-'];
const reposCount = 10;

module.exports.top = function (n) {
    const token = fs.readFileSync('key.txt', 'utf-8');
    var dictionary = {};
    const callback = function (readme, responseCount) {
        fillDictionary(readme, dictionary);
        if (responseCount == reposNames.length * reposCount) {
            let sortedWords;
            sortedWords = Object.keys(dictionary).sort((word1, word2) => {
                if (dictionary[word1] === dictionary[word2]) {
                    return 0;
                }
                return dictionary[word1] < dictionary[word2] ? 1 : -1;
            });
            for (let i = 0; i < n; i++) {
                console.log(`${sortedWords[i]} ${dictionary[sortedWords[i]]}`);
            }
        }

    };

    processReadmes(token, callback);
};

module.exports.count = function (word) {
    const token = fs.readFileSync('key.txt', 'utf-8');
    var wordCount = 0;
    const callback = function (readme, responseCount) {
        readme.forEach((readmeWord) => {
            let readmeWordStem = natural.PorterStemmerRu.stem(readmeWord);
            let wordStem = natural.PorterStemmerRu.stem(word);

            if (readmeWordStem === wordStem) {
                wordCount++;
            }
        });
        if (responseCount == reposNames.length * reposCount) {
            console.log(wordCount);
        }
    };

    processReadmes(token, callback);
};

function processReadmes(token, callback) {
    const https = require('https');
    let responseCount = 0;

    reposNames.forEach((repo) => {
        for (let i = 1; i <= reposCount; i++) {
            let str = '';
            let repoPath = repo + i;
            const req = https.request({
                hostname: 'api.github.com',
                port: 443,
                path: `/repos/urfu-2015/${repoPath}/readme?access_token=${token}`,
                headers: {
                    'User-Agent': 'web-dev-task-1'
                }
            });

            req.end();
            req.on('response', (response) => {
                response.on('data', (chunk) => {
                    str += chunk;
                });
                response.on('end', () => {
                    responseCount++;
                    let readme64 = JSON.parse(str).content;
                    let readme = new Buffer(readme64, 'base64').toString('utf-8');
                    readme = clearReadme(readme);
                    callback(readme, responseCount);
                });
            }
            );
        }
    });
}

function clearReadme(data) {
    data = data.toLowerCase();
    let symblos = /[^а-яА-Я]/;
    data = data
        .split(symblos)
        .filter((item) => {
            return item !== '' && disallowedWords.indexOf(item) === -1;
        });
    return data;
}

function fillDictionary(data, dictionary) {
    if (Object.keys(dictionary).length === 0) {
        dictionary[data[0]] = 1;
    }
    data.forEach((word) => {
        let hasCognate = false;
        let keys = Object.keys(dictionary);

        for (let i = 0; i < keys.length; i++) {
            let keyStem = natural.PorterStemmerRu.stem(keys[i]);
            let wordStem = natural.PorterStemmerRu.stem(word);

            if (keyStem === wordStem) {
                dictionary[keys[i]]++;
                hasCognate = true;
                break;
            }
        }
        if (!hasCognate) {
            dictionary[word] = 1;
        }
    });
}
