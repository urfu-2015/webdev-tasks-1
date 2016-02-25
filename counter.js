const counter = require('./index.js');
counter.count('котики', function (result) {
    console.log(result);
});

counter.top(10, function (result) {
    console.log(result);
});
