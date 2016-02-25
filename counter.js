'use strict';

const request = require('sync-request');
const natural = require('natural');
var stemmer = natural.PorterStemmerRu;
stemmer.attach();
const fs = require('fs');
const token = fs.readFileSync('token.txt');
var forbidden_words = ['в', 'на', 'и', 'не', 'по', 'у', 'к', 'с', 'а', 'для', 'при'];

module.exports.top = function (amount) {
    var dict = GetDictionary('orgs/urfu-2015/repos');
    bySortedValue(dict, amount, function (key, value) {
        console.log(key + ': ' + value);
    });

};

module.exports.count = function (word) {
    word = word.stem();
    var dict = GetDictionary('orgs/urfu-2015/repos');
    if (dict[word]) {
        console.log(word + ': ' + dict[word]);
    } else {
        console.log(word + ': 0');
    }
};

var GetDictionary = function (query) {
    var readmes = [];
    var data = request('GET', 'https://api.github.com/' + query + '?access_token=' + token,
        {headers: {'User-Agent': 'Readme Analyzer'}});
    var repos = JSON.parse(data.getBody());
    for (var repo in repos) {
        if (repos[repo] &&
            ((repos[repo].full_name.indexOf('verstka-tasks') != -1) ||
            (repos[repo].full_name.indexOf('javascript-tasks') != -1))) {
            data = request('GET', 'https://api.github.com/repos/' + repos[repo].full_name +
                '/readme?access_token=' + token, {headers: {'User-Agent': 'Readme Analyzer'}});
            if (data) {
                var readme = JSON.parse(data.getBody());
                var readme_data = request('GET', readme.download_url,
                    {headers: {'User-Agent': 'Readme Analyzer'}});
                var text = readme_data.getBody().toString();
                readmes.push(text.tokenizeAndStem(true));
            }
        }
    }
    var readmes_text = readmes.reduce(function (a, b) {
        return a.concat(b);
    });
    var dict = {};
    readmes_text.forEach(function (current, index, array) {
        if (/^[а-яА-Я]+$/.test(current) && forbidden_words.indexOf(current) == -1) {
            dict[current] = dict[current] ? dict[current] + 1 : 1;
        }
    });
    return dict;
};

function bySortedValue(obj, iterations_amount, callback) {
    var tuples = [];

    for (var key in obj) {
        tuples.push([key, obj[key]]);
    }

    tuples.sort(function (a, b) {
        return a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0;
    });

    var length = 0;
    while (length < Math.min(tuples.length, iterations_amount)) {
        callback(tuples[length][0], tuples[length][1]);
        length++;
    }
}
