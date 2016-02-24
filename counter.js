var fs = require('fs');
var request = require('request');
var url = require('url');
var async = require('async');

const token = fs.readFileSync('key.txt', 'utf-8');

var prepositions = ['без', 'близ', 'в', 'во', 'вместо', 'вне', 'для', 'до', 'за', 'из', 'изо',
    'из-за', 'из-под', 'к', 'ко', 'кроме', 'между', 'меж', 'на',
    'над', 'надо', 'о', 'об', 'обо', 'от', 'ото', 'перед', 'передо', 'пред', 'предо',
    'пo', 'под', 'подо', 'при', 'про', 'ради', 'с', 'со', 'сквозь', 'среди',
    'у', 'через', 'но', 'а', 'или', 'и', 'не', 'либо', 'если'];




var rootDictionary = [];

async.waterfall([
    receiveRepoNames,
    getTaskContent,
    workDictionary,
    findSameWords,
    function (data, callback) {
        for (var key in data) {
            if (data.hasOwnProperty(key)){
                rootDictionary.push([key, data[key]])
            }
        }
        rootDictionary.sort(function (a, b) {
            return a[1].num  - b[1].num;
        });
        //console.log(rootDictionary);
        callback(null);
    }
], function (err) {});


module.exports.top = function (n) {
    return rootDictionary.slice(0, n);
};

module.exports.count = function (word) {
    var root;
    request('http://vnutrislova.net/' + encodeURI('разбор/по-составу/' + word),
        function (err, res, body) {
            if (!err && res.statusCode == 200 && body.indexOf('span class="root">') !== -1) {
                root = body.substring(body.indexOf('span class="root">'));
                root = root.substring(18, root.indexOf('<'));
            } else {
                root = word;
            }
            if (rootDictionary.hasOwnProperty(root)) {
                return rootDictionary[root].num
            } else {
                return 0
            }
        });
};


function receiveRepoNames(callback) {
    request({
        headers: {
            'User-Agent': 'mdf-app'
        },
        uri:'https://api.github.com/orgs/urfu-2015/repos?access_token=' + token},
        function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var reponames = getRepoNames(JSON.parse(body)).filter(
                    function (elem) {
                        return (elem.indexOf('task') !== -1);
                    }
                );
                callback(null, reponames);
            } else {
                callback(err);
            }
        }
    )
}

function getRepoNames(data) {
    var result = [];
    for (var i = 0; i < data.length; i++) {
        result.push(data[i].name)
    }
    return result;
}

function getTexFromPage(data) {
    data = data.replace(/[^а-яё]|\s+/gi, ' ').toLocaleLowerCase();
    return data;
}

function getTaskContent(reponames, cb) {
    var words = [];
    async.each(reponames,
        function (elem, callback) {
            request({
                headers: {'User-Agent': 'mdf-app'},
                uri:'https://raw.githubusercontent.com/urfu-2015/' + elem + '/master/README.md'
            },
                function (err, res, body) {
                    if (!err && res.statusCode == 200) {
                        words.push(getTexFromPage(body).split(/\s+/));
                        callback();
                    } else {
                        callback(err);
                    }
                }
            );
        },
        function (err) {
            cb(err, words);
        }
    )
}



function workDictionary(words, callback) {
    var dictionary = {};
    var word;
    for (var i = 0; i < words.length; i++) {
        for (var j = 0; j< words[i].length; j++) {
            word = words[i][j];
            if (word.length > 0 && prepositions.indexOf(word) == -1) {
                if (!dictionary.hasOwnProperty(word)) {
                    dictionary[word] = 1;
                } else {
                    dictionary[word] += 1;
                }
            }
        }
    }
    callback(null, dictionary);
}

function findSameWords(dictionary, cb) {
    var roots = {};
    async.forEachOf(dictionary,
        function (num, word, callback) {
            var root;
            request('http://vnutrislova.net/' + encodeURI('разбор/по-составу/' + word),
                function (err, res, body) {
                    if (!err && res.statusCode == 200 && body.indexOf('span class="root">') !== -1) {
                        root = body.substring(body.indexOf('span class="root">'));
                        root = root.substring(18, root.indexOf('<'));
                    } else {
                        root = word;
                    }
                    if (roots.hasOwnProperty(root)) {
                        roots[root].words.push(word);
                        roots[root].num += num;
                    } else {
                        roots[root] = {};
                        roots[root].words = [word];
                        roots[root].num = num;
                    }
                    callback();

                }
            )
        },
        function (){
            cb(null, roots);
        });
}


