const fs = require('fs');
module.exports.token = fs.readFileSync('./key.txt', 'utf-8');
module.exports.prepsAndConjs = require('./forbiddenWords.json');
module.exports.natural = require('natural').PorterStemmerRu;
module.exports.request = require('request-promise');
