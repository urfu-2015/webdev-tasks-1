var counter = require('./counter.js');
counter.count('котик', function (data) {
    console.log(data);
});
