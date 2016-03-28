var counter = require('./counter.js');

counter.top(10, (error, top) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(top);
});
counter.top(3, (error, top) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(top);
});
counter.count('котик', (error, count) => {
    if (error) {
        console.log(error);
        return;
    }
    console.log(count);
});
