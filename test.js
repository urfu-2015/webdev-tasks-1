var counter = require('./counter.js');
counter.count('элемент', function (data) {
    console.log(data);
});
