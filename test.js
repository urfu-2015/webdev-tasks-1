/**
 * Created by savi on 20.02.16.
 */

const counter = require('./counter.js');

// counter работает весьма шустро

//counter.count('время', function (err, data) {
//    if (!err) {
//        console.log(data);
//    } else {
//        console.error(err);
//    }
//});

//counter.count('скрипт', function (err, data) {
//    if (!err) {
//        console.log(data);
//    } else {
//        console.error(err);
//    }
//});

// top для 10 репозиториев - 42 секунды
// top для 20 репозиториев - Чуть вдвое больше, смотря как повезёт с интернетом

counter.top(10, function (err, data) {
    if (!err) {
        console.log(data);
    } else {
        console.error(err);
    }
});
