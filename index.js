'use strict';

const MyStem = require('mystem3');
const Promise = require('bluebird');

const mystem = new MyStem({flags: '-dig --format json --eng-gr --fixlist fixlist.txt'});
mystem.start();
module.exports = mystem;
const counter = require('./counter');

Promise.all([
    counter.count('бабуленька')
        .then(val => console.log(val))
        .catch(err => console.log('Error: ' + err)),
    counter.top(10)
        .then(res => {
            for (let key of Object.keys(res)) {
                console.log(key + ' ' + res[key]);
            }
        })
        .catch(err => console.log('Error: ' + err))
])
.then(() => mystem.stop());
