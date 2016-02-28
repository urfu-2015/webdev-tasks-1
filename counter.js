'use strict';
var Promise = require('bluebird');
var request = require('request');
var RussianStemmer = require('snowball-stemmer.jsx/dest/russian-stemmer.common.js').RussianStemmer;
var config = require('./config');

var urls = config.repos.map(function (repo) {
        return config.repoPath + repo + '/readme?access_token=' + config.token;
});

var findTop = function (data) {
    var words = [];
    data.forEach(function (str) {
        var result = str.match(/[а-яa-z]+/ig);
        if (result !== null) {
            for (var i = 0; i < result.length; i++) {
                if (words.indexOf(result[i]) < 0) words.push(result[i]);
            }
        }
    });
    var stemmer = new RussianStemmer;
    var result = [];
    for (var i = 0; i < words.length; i++) {
        var stem = stemmer.stemWord(words[i]);
        var exists = false;
        for (var j = 0; j < result.length; j++) {
            if (result[j][0] === stem) {
                result[j][1] += 1;
                exists = true;
                break;
            }
        }
        if (!exists) result.push([stem, 1, words[i]]);
    }
    result.sort(function (a, b) {
        return b[1] - a[1];
    });
    return result;
};

var printTop = function (data, n) {
    if (n >= data.length) n = data.length -1;
    for (var i = 0; i < n; i++) {
        console.log(data[i][2], data[i][1]);
    }
};

var printCount = function (data, word) {
    var stemmer = new RussianStemmer;
    var stem = stemmer.stemWord(word);
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] === stem) {
            console.log(data[i][1]);
            break;
        }
    }
};

var generate = function(method, attr) {
    var res = [];
    var func;
    if (method === 'top') {
        func = printTop;
    }
    if (method === 'count') {
        func = printCount;
    }

    Promise.map(urls, function(url) {
        return new Promise(function (resolve, reject) {
            var options = {
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
                }
            };
            request(options, function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    res.push('');
                    reject();
                    return;
                }
                const registry = JSON.parse(body);
                res.push(new Buffer(registry.content, 'base64').toString('utf-8'));
                resolve();
            })
        })
    }).then(function() {
        var result = findTop(res);
        func(findTop(res), attr);
    }).catch(function() {
        var count = 0;
        res.forEach(function (str) {
            if (str === '' ) count += 1;
        }, this);
        count = urls.length - count;
        console.log('Результаты на основе ' + count + ' задач:');
        func(findTop(res), attr);
    });
};

module.exports.top = function (n) {
    generate('top', n);
};

module.exports.count = function (word) {
    generate('count', word);
};
