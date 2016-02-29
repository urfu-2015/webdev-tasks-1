'use strict';

const request = require('sync-request');
const natural = require('natural');
var stemmer = natural.PorterStemmerRu;
stemmer.attach();
const fs = require('fs');
const token = fs.readFileSync('token.txt');
const url = require('url');
var forbiddenWords = ['в', 'на', 'и', 'не', 'по', 'у', 'к', 'с', 'а', 'для', 'при'];

module.exports.top = function (amount) {
    var dict = GetDictionary('orgs/urfu-2015/repos');
    bySortedValue(dict, amount, function (key, value) {
        console.log(key + ': ' + value);
    });

};

module.exports.count = function (word) {
    word = word.stem();
    var dict = GetDictionary('orgs/urfu-2015/repos');
    var amount = dict[word] ? dict[word] : '0';
    console.log(word + ': ' + amount);
};

var GetDictionary = function (query) {
    var readmes = [];
    var data = request('GET', url.format({
        protocol: 'https',
        hostname: 'api.github.com',
        pathname: query,
        search: '?access_token=' + token}),
        {headers: {'User-Agent': 'Readme Analyzer'}});
    var repos = JSON.parse(data.getBody());
    for (var repo in repos) {
        if (isRepoSatisfying(repos[repo])) {
            data = request('GET', url.format({
                protocol: 'https',
                hostname: 'api.github.com',
                pathname: 'repos/' + repos[repo].full_name + '/readme',
                search: '?access_token=' + token}), {headers: {
                    'User-Agent': 'Readme Analyzer',
                    Accept: 'application/vnd.github.VERSION.raw'}});
            if (data) {
                var text = data.getBody().toString();
                readmes.push(text.tokenizeAndStem(true));
            }
        }
    }
    var readmes_text = readmes.reduce(function (a, b) {
        return a.concat(b);
    }, []);
    var dict = {};
    readmes_text.forEach(function (current, index, array) {
        if (/^[а-яё]+$/i.test(current) && forbiddenWords.indexOf(current) == -1) {
            dict[current] = dict[current] ? dict[current] + 1 : 1;
        }
    });
    return dict;
};

function isRepoSatisfying(repo) {
    return repo &&
        (repo.full_name.indexOf('verstka-tasks') != -1 ||
        repo.full_name.indexOf('javascript-tasks') != -1);
}

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
