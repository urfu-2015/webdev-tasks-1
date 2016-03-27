const counter = require('./counter');
counter.count('котик').then(function (data) {
    console.log(data);
});
counter.top(10).then(function (data) {
    console.log(data);
});
