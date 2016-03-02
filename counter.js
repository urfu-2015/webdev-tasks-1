const request = require('request');
const fs = require('fs');
const async = require('async');
const url_git = 'https://api.github.com/orgs/urfu-2015/repos?access_token=';
const url_roots = 'http://vnutrislova.net/';
const fileKey = 'key.txt';
var reRoot = /корень \[([а-я]*)]/i;
var fileWords = 'stopWords.txt';
var fileStat = 'statistic.txt';

var result = {};
var roots = [];

function getRoots(words, stopWords, callback) {
    async.waterfall([
        function get_roots(next) {
            async.each(words, function (word, callback) {
                if (stopWords.indexOf(word) === -1) {
                    var check = hasWord(word);
                    if (check) {
                        result[check].push(word);
                    } else {
                        request({
                                url: url_roots + encodeURI('разбор/по-составу/') + encodeURI(word),
                                method: 'GET'
                            },
                            function (err, res, body) {
                                var root;
                                if (!err && res.statusCode === 200) {
                                    root = body.match(reRoot);
                                    if (root && root[1] !== undefined) {
                                        if (roots.indexOf(root[1]) === -1) {
                                            roots.push(root[1]);
                                            result[root[1]] = [];
                                        }
                                        result[root[1]].push(word);
                                    }
                                }
                                callback();
                            })
                    }
                } else {
                    callback();
                }
            }, function (err) {
                next(null);
            })
        },
        function write_roots(next) {
            fs.writeFile(fileStat, JSON.stringify(result), function (err) {
                callback(null);
            })
        }
    ]);
}

function hasWord(word) {
    for (var root in result) {
        if (result[root].indexOf(word) !== -1) {
            return root;
        }
    }
    return false;
}

function getData(req_arg, req) {
    async.waterfall([
        function getKey(callback) {
            fs.readFile(fileKey, 'utf-8', function(err, data) {
                callback(null, data);
            });
        },

        function getRepos(key, callback) {
            request({
                    url: url_git + key,
                    method: 'GET',
                    headers: {'user-agent': 'mdf-app'}
                },
                function (err, res, body) {
                    if (!err && res.statusCode === 200) {
                        var repos = JSON.parse(body);
                        var tasks = [];
                        for (var i = 0; i < repos.length; i++) {
                            if (repos[i].name.indexOf('tasks') !== -1) {
                                tasks.push(repos[i]);
                            }
                        }
                        callback(null, tasks);
                    }
                }
            )
        },

        function getWords(repos, callback) {
            var all_words = [];
            async.eachSeries(repos, function (repo, callback) {
                request({
                        url: repo.contents_url.replace(/\{\+(\w)*}/, 'README.md'),
                        method: 'GET',
                        headers: {'user-agent': 'mdf-app'}
                    },
                    function (err, res, body) {
                        var ok = true;
                        try {
                            var url = JSON.parse(body);
                        } catch(err) {
                            ok = false;
                        }
                        if (ok) {
                            request({
                                    url: url.download_url,
                                    method: 'GET',
                                    headers: {'user-agent': 'mdf-app'}
                                },
                                function (err, res, body) {
                                    if (!err && res.statusCode === 200) {
                                        var words = body.replace(/[^А-Яа-я ]/g, ' ').replace(/\s+/g, ' ')
                                            .replace(/^\s|\s$/g, '').toLowerCase().split(' ');

                                        words.forEach(function (word) {
                                            all_words.push(word);
                                        });
                                    }
                                    callback();
                                }
                            );
                        }
                    }
                );
            }, function (err, all_words) {
                callback(null, all_words);
            });
        },

        function getStopWords(all_words, callback) {
            fs.readFile(fileWords, 'utf-8', function (err, data) {
                callback(null, all_words, data.split('\r\n'));
            });
        },

        function getStat(all_words, stopWords, callback) {
            fs.readFile(fileStat, 'utf-8', function (err, data) {
                if (err) {
                    getRoots(all_words, stopWords, callback);
                } else {
                    try {
                        result = JSON.parse(data);
                    } catch(err) {
                        throw err;
                    }
                    callback(null);
                }
            });
        },

        function fin(callback) {
            if (req === 'count') {
                var check = hasWord(req_arg);
                if (check) {
                    console.log(req_arg, result[check].length);
                    callback(null);
                } else {
                    request({
                            url: url_roots + encodeURI('разбор/по-составу/') + encodeURI(req_arg),
                            method: 'GET'
                        },
                        function (err, res, body) {
                            var root;
                            if (!err && res.statusCode === 200) {
                                root = body.match(reRoot);
                                if (root && root[1] !== undefined) {
                                    console.log(req_arg, result[root[1]].length);
                                }
                            }
                            callback(null);
                        })
                }
            } else if (req === 'top') {
                var sort_mas = [];
                for (var root in result) {
                    sort_mas.push([root, result[root].length]);
                }

                sort_mas.sort(function(a, b) {
                    return b[1] - a[1];
                });
                var i = 0;
                while (i < req_arg) {
                    console.log(result[sort_mas[i][0]][0], sort_mas[i][1]);
                    i += 1;
                }
                callback(null);
            }
        }
    ]);
}

exports.count = function (word) {
    getData(word, 'count');
};

exports.top = function (count) {
    getData(count, 'top');
};
