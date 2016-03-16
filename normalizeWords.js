'use strict';

const bluebird = require('bluebird');
const getAllReadMe = require('./getAllReadMe');

module.exports = bluebird.promisify((user, callback) => {
    let readMeTexts = getAllReadMe(user);
    const excluded = require('./excludedWords');
    let wordTypes = Object.keys(excluded);
    let excludedWords = wordTypes.reduce((words, type) =>
            words.concat(excluded[type]), [])
        .map(word =>
            word.toLowerCase()
        );
    readMeTexts
        .then(texts => {
            let words = texts.reduce((words, text) => {
                let newWords = text.replace(/[^а-яё]+/g, ' ')
                    .trim()
                    .split(' ')
                    .map(word =>
                        word.toLowerCase()
                    )
                    .filter(word =>
                        excludedWords.indexOf(word) === -1
                    );
                return words.concat(newWords);
            }, []);
            callback(null, words);
        })
        .catch(callback);
});
