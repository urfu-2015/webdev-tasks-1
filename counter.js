'use strict';

const natural = require('natural');
const normalizeWords = require('./normalizeWords');
const config = require('./config');

const user = config.user;

const count = function (word, callback) {
    normalizeWords(user)
        .then(words => {
            let count = 0;
            const rootWord = natural.PorterStemmerRu.stem(word);
            words.forEach(function (word) {
                const root = natural.PorterStemmerRu.stem(word);
                if (rootWord === root) {
                    count++;
                }
            });
            callback(null, count);
        })
        .catch(callback);
};

const top = function (n, callback) {
    normalizeWords(user)
        .then(words => {
            let statistics = {};
            words.forEach(function (word) {
                const root = natural.PorterStemmerRu.stem(word);
                if (!statistics[root]) {
                    statistics[root] = {
                        word: word,
                        count: 1
                    };
                    return;
                }
                statistics[root].count++;
            });
            const res = Object
                .keys(statistics)
                .sort((root, anotherRoot) => statistics[anotherRoot].count - statistics[root].count)
                .slice(0, n)
                .map(root => `${statistics[root].word} ${statistics[root].count}`)
                .join('\n\r');
            callback(null, res);
        })
        .catch(callback);
};

module.exports = {
    top: top,
    count: count
};
