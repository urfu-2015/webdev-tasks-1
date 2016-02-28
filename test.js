/**
 * Created by savi on 20.02.16.
 */

const counter = require('./counter.js');

// counter работает весьма шустро

//counter.count('время');
//counter.count('скрипт');

// top для 10 репозиториев - 42 секунды
// top для 20 репозиториев - Чуть вдвое больше, смотря как повезёт с интернетом

counter.top(10);
