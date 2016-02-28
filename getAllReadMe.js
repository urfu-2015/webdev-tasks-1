'use strict';

const fs = require('fs');
const Github = require('github');
const co = require('co');
const coGit = require('co-github');

var token = fs.readFileSync('key.txt', 'utf-8').trim();

var gh = new Github({
    version: '3.0.0'
});

gh.authenticate({
    type: 'oauth',
    token: token
});

var github = coGit(gh);


var readMeTexts = co.wrap(function *(user) {
    var userData = yield github.repos.getFromUser({user: user});
    var repositoriesPromises = userData
        .map(function (repo) {
            return repo.name;
        })
        .filter(function (name) {
            return name.indexOf('tasks') > -1;
        })
        .map(function (name) {
            return github.repos.getReadme({
                user: user,
                repo: name
            });
        });
    var reposData = yield repositoriesPromises;
    return reposData
        .map(function (readMeData) {
            var buffer = new Buffer(readMeData.content, 'base64');
            return buffer.toString();
        });
});

module.exports = readMeTexts;

