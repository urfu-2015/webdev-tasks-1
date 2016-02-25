const counter = require('./index.js');
counter.count('задания', function (result) {
    console.log('count');
    console.log(result);
});

counter.top(10, function (result) {
    console.log('top');
    console.log(result);
});
