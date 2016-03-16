'use strict';

const natural = require('natural');
const normalizeWords = require('./normalizeWords');
const config = require('./config');

const user = config.user;

let count = function (word, callback) {
    normalizeWords(user)
        .then(words => {
            let count = 0;
            let rootWord = natural.PorterStemmerRu.stem(word);
            words.forEach(function (word) {
                let root = natural.PorterStemmerRu.stem(word);
                if (rootWord === root) {
                    count++;
                }
            });
            callback(null, count);
        })
        .catch(callback);
};

let top = function (n, callback) {
    normalizeWords(user)
        .then(words => {
            let statistics = {};
            words.forEach(function (word) {
                let main = natural.PorterStemmerRu.stem(word);
                if (!statistics[main]) {
                    statistics[main] = {
                        word: word,
                        count: 1
                    };
                    return;
                }
                statistics[main].count++;
            });
            let top = Object.keys(statistics).sort((root, anotherRoot) =>
                statistics[anotherRoot].count - statistics[root].count)
                .slice(0, n);
            let res = top
                .map(root => `${statistics[root].word} ${statistics[root].count}`)
                .join('\n\r');
            callback(null, res);
        })
        .catch(callback);
};

count('котик', (err, n) => {
    if (err) {
        console.error('err', err);
        return;
    }
    console.log('res', n);
});

module.exports = {
    top: top,
    count: count
};
