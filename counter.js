var fs = require('fs');
var request = require('request');
var url = require('url');
var async = require('async');

const token = fs.readFileSync('key.txt', 'utf-8');

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
            return result.slice(0, n);
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
                            root = getRoot(res, body, word);
                        }
                        dict.filter(function (elem) {
                            return elem[0] == root;
                        });
                        if (dict.length == 0) {
                            return 0;
                        }
                        prettyPrint(dict);
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
    return new Promise(function (resolve, reject) {
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
                    console.log('repositories names get');
                    resolve(reponames);
                } else {
                    reject(err);
                }
            }
        )
    });

}

function getRepoNames(data) {
    var result = [];
    data.forEach(function (repoName) {
        result.push(repoName.name)
    });
    return result;
}

function getTexFromPage(data) {
    return data.replace(/[^а-яё]|\s+/gi, ' ').toLocaleLowerCase();
}

function getTaskContent(reponames) {
    var words = [];
    return new Promise(function (resolve, reject) {
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
                if (err){
                    reject(err);
                }
                console.log('words parsed');
                resolve(words);
            }
        )
    })
}

function workDictionary(words) {
    var dictionary = {};
    words.forEach(function (entry) {
        entry.forEach(function (word) {
            if (word.length > 0 && exclude.indexOf(word) == -1) {
                if (!dictionary.hasOwnProperty(word)) {
                    dictionary[word]            = 1;
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
    console.log('searchig roots');
    return new Promise(function (resolve) {
        async.forEachOf(dictionary,
            function (num, word, callback) {
                var root;
                request('http://vnutrislova.net/' + encodeURI('разбор/по-составу/' + word),
                    function (err, res, body) {
                        if (!err) {
                            root = getRoot(res, body, word);
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
                var dict = [];
                for (var key in roots) {
                    if (roots.hasOwnProperty(key)){
                        dict.push([key, roots[key]])
                    }
                }
                dict.sort(function (a, b) {
                    return b[1].num  - a[1].num;
                });
                console.log('roots founded');
                resolve(dict);
            });
    });
}

function getRoot(res, body, word) {
    var root;
    if (res.statusCode == 200) {
        root = body.substring(body.indexOf('span class="root">'));
        root = root.substring(18, root.indexOf('<'));
    } else {
        root = word;
    }
    return root;
}
