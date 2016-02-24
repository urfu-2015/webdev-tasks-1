'use strict';
var request = require('./node_modules/request');
var stemmer = require('./node_modules/snowball-stemmer.jsx/dest/russian-stemmer.common').RussianStemmer;
var fs = require('fs');
var token = fs.readFileSync('./key.txt', 'utf-8');

//request('http://www.google.com', function (error, response, body) {
//    if (!error && response.statusCode == 200) {
//        console.log(body); // Show the HTML for the Google homepage.
//    }
//});

//console.log(stemmer.stemWord("дети"));
var headers = {
    'User-Agent': 'request'
};

function options (url) {
    return {
        url: url,
        headers: headers
    }
}


function getRepos(error, response, body) {
    var listOfRepos = [];
    if (!error && response.statusCode === 200) {
        var repoInfo = JSON.parse(body);
        for (var j in repoInfo) {
            listOfRepos.push(repoInfo[j].name);
        }
        for (var j in listOfRepos) {
            //console.log(listOfRepos[j]);
            //https://raw.githubusercontent.com/
            request(options('https://raw.githubusercontent.com/octocat/' + listOfRepos[j] +
                '/master/README.md'), lookThroughReadme);
        }
    }
}

function lookThroughReadme (error, response, body) {
    if (!error && response.statusCode === 200) {
        //var readmeInfo = JSON.parse(body);
        //console.log(readmeInfo['html_url']);
        console.log(body);
    }
}

request(options('https://api.github.com/users/octocat/repos'), getRepos);

//for (var i in listOfRepos) {
//    console.log("Here");
//    console.log(i, listOfRepos[i]);
//
//}


// 1. список репозиториев +
// 2. бежим по нему, вытаскиваем адрес README, получаем содержимое, бежим по нему, парсим по
// пробелам-знакам

module.exports.count = function (word) {

};

module.exports.top = function (n) {

};
