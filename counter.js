const request = require('request');
const fs = require('fs');
const async = require('async');
var reRoot = /корень \[([а-я]*)]/i;

var result = {};
var roots = [];

function getRoot(word) {
    var res_count = 0;
    async.series([
        request({
            url: 'http://vnutrislova.net/' + encodeURI('разбор/по-составу/') + encodeURI(req_arg),
            method: 'GET'
        },
        function (err, res, body) {
            var root;
            //console.log(body);
            if (!err && res.statusCode === 200) {
                root = body.match(reRoot);
                //console.log(root[1]);
                if (root && root[1] !== undefined) {
                    console.log(root[1]);
                    res_count += root[1];
                    }
                }
            }
        ),
        function ret() {
            return res_count;
        }
    ]);
}

function getData(req_arg, req) {

    async.waterfall([
        function getKey(callback) {
            fs.readFile('key.txt', 'utf-8', function(err, data) {
                callback(null, data);
            });
        },
        function getRepos(key, callback) {
            request({
                    url: 'https://api.github.com/orgs/urfu-2015/repos?access_token=' + key,
                    method: 'GET',
                    headers: {'user-agent': 'mdf-app'}
                },
                function (err, res, body) {
                    console.log(res.statusCode);
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
            console.log(repos.length);
            async.eachSeries(repos, function (repo, callback) {
                request({
                        url: repo.contents_url.replace(/\{\+(\w)*}/, 'README.md'),
                        method: 'GET',
                        headers: {'user-agent': 'mdf-app'}
                    },
                    function (err, res, body) {
                        console.log(res.statusCode);
                        request({
                                url: JSON.parse(body).download_url,
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
                );
            }, function (err, all_words) {
                callback(null, all_words);
            });
        },

        function getRoots(all_words, callback) {
            async.eachSeries(all_words, function (word, callback) {
                    request({
                            url: 'http://vnutrislova.net/' + encodeURI('разбор/по-составу/') + encodeURI(word),
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
                        }
                    )
                },
                function (err) {
                    callback(null);
                }
            )
        },
        function fin(callback) {
            if (req === 'count') {
                async.waterfall([
                    function getRoot(callback) {
                        var res_count = 0;
                        callback(getRoot(req_arg));
                    },
                    function printer(root) {
                        console.log(result[root]);
                    }
                ]);
            } else if (req === 'top') {
                console.log(result[req_arg]);
            }
        }
    ]);
}

module.exports.count = function (word) {
    getData(word, 'count');
};

module.exports.top = function (count) {
    getData(count, 'top');
};
