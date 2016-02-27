const counter = require('./counter.js');

counter
    .count('котик')
    .then(top => console.log(top))
counter
    .count('вы')
    .then(top => console.log(top))
counter
    .top(10)
    .then(top => console.log(top))
