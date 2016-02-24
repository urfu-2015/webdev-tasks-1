/**
 * Created by hx0day on 21.02.16.
 */
const fs = require('fs');
const request = require('request');
const natural = require('natural');
const all_word = require('./word.js');
const async = require('async');
const oauth_token = fs.readFileSync('.key', 'utf-8');

function getRequestDataGitAPI(query) {
    return {
        url: 'https://api.github.com/' + query + '?access_token=' + oauth_token,
        method: 'GET',
        headers: {
            'user-agent': 'webdev-tasks-1'
        }
    };
}

function getRepoUrl(_, body, callback) {
    var dataJSON = JSON.parse(body);
    var all_repo_url = [];
    dataJSON.forEach(function (repo) {
        if (repo.name.indexOf('tasks') != -1) {
            var url = 'repos/' + repo.full_name + '/readme';
            all_repo_url.push(url.replace(/\s/, ''));
        }
    });
    callback(null, all_repo_url);
}

function getAllReadmeUrl(all_repo_url, callback) {
    async.map(all_repo_url, function (url, callback) {
        request(
            getRequestDataGitAPI(url),
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var dataJSON = JSON.parse(body);
                    callback(null, dataJSON.download_url);
                } else {
                    callback(error || response.statusCode);
                }
            });
    }, callback);
}

function getAllWords(readme_url, callback) {
    async.map(readme_url, function (url, callback) {
        request(url,
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    body = body.replace(/[^А-Яа-яЁё\- ]/g, ' ').toLowerCase();
                    all_word.forEach(function (world) {
                        body = body.replace(new RegExp(' ' + world + ' ', 'g'), ' ');
                    });
                    body = body.replace(/ [-,]{1,} /g, ' ').replace(/\s+/g, ' ');

                    callback(null, body);

                } else {
                    callback(error || response.statusCode);
                }
            });
    }, callback);
}

function getStat(text, callback) {
    var all_world = text.toString().split(' ');
    var roots = {};
    all_world.forEach(function (item) {
        // TODO найти способ поиска более правельных корней
        var root = natural.PorterStemmerRu.stem(item);
        if (!roots[root]) {
            roots[root] = {
                cognate: [item],
                counter: 1
            };
        } else {
            ++roots[root].counter;
            if (roots[root].cognate.indexOf(item) < 0) {
                roots[root].cognate.push(item);
            }
        }
    });
    callback(null, roots);
}
function main(callback) {
    async.waterfall(
        [
            function (callback) {
                return request(getRequestDataGitAPI('orgs/urfu-2015/repos'), callback);
            },
            getRepoUrl,
            getAllReadmeUrl,
            getAllWords,
            getStat
        ],
        callback
    );
}

module.exports.count = function (word) {
    var root = natural.PorterStemmerRu.stem(word);
    var count = function (err, words) {
        console.log(words[root]);
    };
    main(count);
};

module.exports.top = function (count) {

    var top = function (err, words) {
        var keys = Object.keys(words);
        keys.sort(function (k1, k2) {
            return words[k2].counter - words[k1].counter;
        });
        if (!err) {
            for (var i = 0; i < count; i++) {
                console.log(words[keys[i]]);
            }
        }

    };
    main(top);
};

module.exports.count('котики');
module.exports.top(10);
