const counter = require('./counter');
counter.top(10).then((result) => { console.log(result) });
counter.count('задание').then((result) => { console.log(result) });
