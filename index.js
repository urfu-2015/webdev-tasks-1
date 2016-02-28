'use strict';

var counter = require('./counter.js');

counter
    .top(10)
    .then(
        top => top.forEach(pair => console.log(pair)),
        error => console.error(error)
    );

counter
    .count('код')
    .then(
        count => console.log(count),
        error => console.error(error)
    );
