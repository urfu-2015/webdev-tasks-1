const counter = require('./counter.js');

counter.top(10, function (stats) {
    console.log(stats);
});

counter.count('котик', function (wordCount) {
    console.log(wordCount);
});
