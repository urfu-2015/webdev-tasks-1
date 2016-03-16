'use strict';

const fs = require('fs');
const Github = require('github');
const co = require('co');
const coGit = require('co-github');

const token = fs.readFileSync('key.txt', 'utf-8').trim();

let gh = new Github({
    version: '3.0.0'
});

gh.authenticate({
    type: 'oauth',
    token: token
});

let github = coGit(gh);

module.exports = co.wrap(function *(user) {
    let userData = yield github.repos.getFromUser({user: user});
    let getReadmePromises = userData
        .map(repo =>
            repo.name
        )
        .filter(name =>
            name.indexOf('tasks') > -1
        )
        .map(name =>
            github.repos.getReadme({
                user: user,
                repo: name
            })
        );
    let readmeData = yield getReadmePromises;
    return readmeData
        .map(data =>
            new Buffer(data.content, 'base64').toString()
        );
});

