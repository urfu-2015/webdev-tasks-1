'use strict';
const request = require('request');
var RussianStemmer = require('snowball-stemmer.jsx/dest/russian-stemmer.common.js').RussianStemmer;

var key = require('fs').readFileSync('key.txt', 'utf-8');

var urls = ['https://api.github.com/repos/urfu-2015/webdev-tasks-1/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-1/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-2/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-3/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-4/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-5/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-6/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-7/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-8/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-9/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/verstka-tasks-10/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-1/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-2/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-3/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-4/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-5/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-6/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-7/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-8/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-9/readme?access_token=' + key,
    'https://api.github.com/repos/urfu-2015/javascript-tasks-10/readme?access_token=' + key
];

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

    var req = new Promise(function(resolve, reject) {
        urls.forEach(function (uri, i) {
            var options = {
                url: uri,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36'
                }
            };
            request(options, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    //console.log('connected');
                    const registry = JSON.parse(body);
                    res.push(new Buffer(registry.content, 'base64').toString('utf-8'));
                } else {
                    //console.log('Can not connect');
                    res.push('');
                }
                if (res.length === urls.length) {
                    resolve(res);
                }
            });
        });
    });

    req.then(function success (data) {
        var result = findTop(data);
        if (method === 'top') {
            printTop(result, attr);
        }
        if (method === 'count') {
            printCount(result, attr);
        }
        var count = 0;
        data.forEach(function (str) {
            if (str === '' ) count += 1;
        }, this);
        count = data.length - count;
        console.log('На основе ' + count + ' текстов задач');
    });
};

//generate('count', 'котик');

module.exports.top = function (n) {
    generate('top', n);
};

module.exports.count = function (word) {
    generate('count', word);
};
