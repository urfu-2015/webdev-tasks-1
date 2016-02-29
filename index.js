const counter = require('./counter');

counter.top(10, function (err, result) {
    if (!err) {
        result.forEach(function (r) {
            console.log(r.words + ' ' + r.freq);
        });
    } else {
        console.error(err);
    }
});

counter.count('котик', function (err, result) {
    if (!err) {
        console.log('Найдено котиков: ' + result);
    } else {
        console.error(err);
    }
});
