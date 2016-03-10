const fs = require('fs');
const request = require('request');
const url = require('url');
const async = require('async');
const token = fs.readFileSync('key.txt', 'utf-8');
var allWords;

var exclude = getPrepositions();

function getPrepositions() {
    return fs.readFileSync('exclude.txt', 'utf-8').split('\r\n');
}

module.exports.top = function (n) {
    receiveRepoNames()
        .then(getTaskContent)
        .then(workDictionary)
        .then(findSameWords)
        .then(function (result) {
            var dict = [];
            for (var key in result) {
                if (result.hasOwnProperty(key)){
                    if (key != ''){
                        dict.push([key, result[key]])
                    }
                }
            }
            dict.sort(function (a, b) {
                return b[1].num  - a[1].num;
            });
            return dict.slice(0, n);
        }).then(prettyPrint);
};

module.exports.count = function (word) {
    receiveRepoNames()
        .then(getTaskContent)
        .then(workDictionary)
        .then(findSameWords)
        .then(function (dict) {
            var root;
            return new Promise(function (resolve) {
                request('http://vnutrislova.net/' + encodeURI('разбор/по-составу/' + word),
                    function (err, res, body) {
                        if (!err) {
                            root = getRoot(res, body);
                        } else {
                            root = word;
                        }
                        if (!dict.hasOwnProperty(root) || root == '') {
                            return 0;
                        }
                        prettyPrint([[root, dict[root]]]);
                        resolve(dict);
                    }
                );
            })
        });
};

function prettyPrint(dict) {
    for (var e of dict) {
        console.log(e[1].num, e[0], e[1].words);
    }
    return dict;
}

function receiveRepoNames() {
    console.log('getting repositories names');
    var options = {headers: {'User-Agent': 'mdf-app'},
        uri:'https://api.github.com/orgs/urfu-2015/repos?access_token=' + token};
    return new Promise(function (resolve, reject) {
        request(options, function (err, res, body) {
            if (!err && res.statusCode == 200) {
                var reponames = getRepoNames(
                    JSON.parse(body)).filter((elem) => (elem.indexOf('tasks-2') !== -1)
                );
                console.log('repositories names get');
                resolve(reponames);
            } else {
                reject(err);
            }
        })
    });
}

function getRepoNames(data) {
    var result = [];
    data.forEach((repoName) => {result.push(repoName.name)});
    return result;
}

function getTexFromPage(data) {
    return data.replace(/[^а-яё]|\s+/gi, ' ').toLocaleLowerCase();
}

function getTaskContent(reponames) {
    console.log('getting task content');
    var words = [];
    return new Promise(function (resolve, reject) {
        async.each(reponames, function (elem, callback) {
            var options = {headers: {'User-Agent': 'mdf-app'},
                uri:'https://raw.githubusercontent.com/urfu-2015/' + elem + '/master/README.md'};
            request(options, function (err, res, body) {
                if (!err && res.statusCode == 200) {
                    words.push(getTexFromPage(body).split(/\s+/));
                    callback();
                } else {
                    callback(err);
                }
            });
        }, function (err) {
            if (err){
                reject(err);
            } else {
                console.log('words parsed');
                allWords = words;
                resolve(words);
            }
        })
    })
}

function workDictionary(words) {
    var dictionary = {};
    words.forEach(function (entry) {
        entry.forEach(function (word) {
            if (word.length > 0 && exclude.indexOf(word) == -1) {
                if (!dictionary.hasOwnProperty(word)) {
                    dictionary[word] = 1;
                } else {
                    dictionary[word] += 1;
                }
            }
        });
    });
    console.log('dictionary created');
    return dictionary;
}

function findSameWords(dictionary) {
    var roots = {};
    console.log('searching roots');
    return new Promise(function (resolve) {
        async.forEachOf(dictionary,
            function (num, word, callback) {
                var url = 'http://vnutrislova.net/' + encodeURI('разбор/по-составу/' + word);
                var root;
                request(url, function (err, res, body) {
                    if (!err) {
                        root = getRoot(res, body);
                        if (roots.hasOwnProperty(root)) {
                            roots[root].words.push(word);
                            roots[root].num += num;
                        } else {
                            roots[root] = {};
                            roots[root].words = [word];
                            roots[root].num = num;
                        }
                    }
                    callback();
                })
            },
            function (){
                console.log('roots founded');
                resolve(roots);
            });
    });
}

function getRoot(res, body) {
    var root;
    if (res.statusCode == 200 && body.indexOf('span class="root">') !== -1) {
        root = body.substring(body.indexOf('span class="root">'));
        root = root.substring(18, root.indexOf('<'));
    } else {
        root = '';
    }
    return root;
}
