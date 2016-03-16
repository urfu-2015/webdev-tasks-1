'use strict';

const bluebird = require('bluebird');
const getAllReadMe = require('./getAllReadMe');
const excluded = require('./excludedWords');

module.exports = bluebird.promisify((user, callback) => {
    const readMeTexts = getAllReadMe(user);
    const excludedWords = Object
        .keys(excluded)
        .reduce((words, type) => words.concat(excluded[type]), [])
        .map(word => word.toLowerCase());
    readMeTexts
        .then(texts => {
            const allWords = texts.reduce((words, text) => {
                const newWords = text
                    .replace(/[^а-яё]+/g, ' ')
                    .trim()
                    .split(' ')
                    .map(word => word.toLowerCase())
                    .filter(word => excludedWords.indexOf(word) === -1);
                return words.concat(newWords);
            }, []);
            callback(null, allWords);
        })
        .catch(callback);
});
