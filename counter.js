const counter = require('./index.js');
counter.count('задания').then(function (result) {
    console.log(result);
});

counter.top(10).then(function (result) {
    console.log(result);
});
