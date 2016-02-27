'use strict';

var counter = require('./counter.js');

counter.top(10, function (err, results) {
    if (err) {
        callback(err);
    } else {
        results.forEach(result => console.log(result));
    }
});

counter.count('код', function (err, result) {
    if (err) {
        console.log(err);
    } else {
        console.log(result);
    }
});
