'use strict';

const request = require('request');
const fs = require('fs');

var token = 'token ' + fs.readFileSync('key.txt', 'utf-8').trim();
var host = 'https://api.github.com';
var headers = {
    Authorization: token,
    'User-agent': 'node.js'
};

function getRepositoriesNames(user, callback) {
    var url = host + '/users/' + user + '/repos';
    request({url: url, headers: headers}, function (err, res, body) {
        if (err) {
            callback(err);
            return;
        }
        var reposNames = JSON.parse(body)
            .map(function (repos) {
                return repos.name;
            })
            .filter(function (name) {
                return name.indexOf('task') > -1;
            });

        callback(null, reposNames);
    });
}

var getAllReadMe = function (user, callback) {
    getRepositoriesNames(user, function (err, repositoriesNames) {
        if (!repositoriesNames) {
            callback(new Error('Не получены репозитории'));
            return;
        }
        var count = repositoriesNames.length;
        repositoriesNames.forEach(function (name, i) {
            var url = host + '/repos/' + user + '/' + name + '/readme';
            request({
                url: url,
                headers: headers}, function (err, res, body) {
                var buffer = new Buffer(JSON.parse(body).content, 'base64');
                repositoriesNames[i] = buffer.toString('utf-8');
                count--;
                if (!count) {
                    callback(null, repositoriesNames);
                }
            });
        });
    });
};

module.exports = getAllReadMe;
