const counter = require('./counter.js');

counter.top(function (stats) {
    console.log(stats);
});

counter.count('котик', function (wordCount) {
    console.log(wordCount);
});
