'use strict';

var taskList = [];
const https = require('https');
const badWords = require('./badWords.js');

var dictionary = {
    data: {},
    isEmpty: function () {
        return Object.keys(this.data).length === 0;
    },
    parse: function (text) {
        var pattern = /(?:[A-zА-яё]+)|(?:\<.*\>)|(?:\\[A-z])|(?:\:[A-z]+\:)/g;
        var validWordPatt = /(?:^[А-Яа-яё]{2,}$)/;
        var allWords = text.match(pattern);
        allWords.forEach(word => {
            var word = word.toLowerCase();
            if (validWordPatt.test(word) && badWords.indexOf(word) === -1) {
                for (var dictWord in this.data) {
                    if (this.isSameRootWord(dictWord, word)) {
                        this.data[dictWord]++;
                        return;
                    };
                }
                this.data[word] = 1;
            }
        });
    },
    top: function (number) {
        var mostUsedWords = [];
        for (var dictWord in this.data) {
            for (var i = 0; i < number; i++) {
                var word = mostUsedWords[i];
                if (this.data[word] > this.data[dictWord]) {
                    mostUsedWords.splice(i, 0, dictWord);
                    break;
                }
                if (i === mostUsedWords.length - 1) {
                    mostUsedWords.push(dictWord);
                    break;
                }
                if (word === undefined) {
                    mostUsedWords[i] = dictWord;
                    break;
                }
            }
            while (mostUsedWords.length > number) {
                mostUsedWords.shift();
            }
        }
        mostUsedWords.forEach(word => {
            console.log(word + '  ' + this.data[word]);
        });
    },
    count: function (word) {
        for (var dictWord in this.data) {
            if (this.isSameRootWord(word, dictWord)) {
                console.log(this.data[dictWord]);
                return;
            }
        }
        console.log('Нет совпадений!');
    },
    isSameRootWord: function (firstWord, secondWord) {
        var rootWordLength = 3;
        var i = 0;
        var j = rootWordLength;
        while (
            j <= firstWord.length &&
            i < firstWord.length / 2 &&
            i < secondWord.length / 2
        ) {
            j = i + rootWordLength;
            var rootWord = firstWord.slice(i, j);
            while (
                secondWord.indexOf(rootWord) !== -1 &&
                secondWord.indexOf(rootWord) < secondWord.length / 2 &&
                j <= firstWord.length
            ) {
                if (
                    rootWord.length >= firstWord.length / 2 ||
                    rootWord.length >= secondWord.length / 2
                ) {
                    return true;
                }
                j++;
                rootWord = firstWord.slice(i, j);
            }
            i++;
        }
        return false;
    }
};

var sendHttpReq = function (path, callback) {
    var json;
    var options = {
        hostname: 'api.github.com',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            'User-Agent': 'My-Test-App',
            //Authorization: ,
            Accept: 'application/vnd.github.v3+json'
        }
    };

    var req = https.request(options, function (res) {
        res.setEncoding('utf8');
        var data = '';
        res.on('data', (d) => {
            data += d;
        });

        res.on('end', function () {
            var response = JSON.parse(data);
            if (res.statusCode !== 200) {
                console.log('Ошибка: HTTP ' + res.statusCode);
                console.log(response.message);
                console.log(response.documentation_url);
                return;
            }
            callback(response);
        });
    });
    req.end();
};

var getRepos = function () {
    sendHttpReq('/orgs/urfu-2015/repos', getTasks);
};

var getTasks = function (response) {
    var taskCounter = 0;
    var tasksParsedCounter = 0;
    response.forEach(function (entry) {
        if (
            entry.name.indexOf('verstka-tasks-') !== -1 ||
            entry.name.indexOf('javascript-tasks-') !== -1
        ) {
            taskCounter++;
            var path = '/repos/urfu-2015/' + entry.name + '/contents/README.md?ref=master';
            sendHttpReq(path, function (response) {
                var taskText = (new Buffer(response.content, 'base64')).toString('utf-8');
                dictionary.parse(taskText);
                tasksParsedCounter++;
                if (taskCounter === tasksParsedCounter) {
                    taskList.forEach(func => {
                        func();
                    });
                }
            });
        }
    });
};

getRepos();

module.exports.count = function (word) {
    taskList.push(
        function () {
            dictionary.count(word);
        }
    );
};

module.exports.top = function (number) {
    taskList.push(
        function () {
            dictionary.top(number);
        }
    );
};
