function checkCondition(success, failure) {
    return new Promise((resolve, reject) => {
        var flagSuccess = success(),
            flagfailure = failure();

        if (flagSuccess) {
            resolve();

            return;
        }

        if (flagfailure) {
            reject();

            return;
        }

        setTimeout(() => {
            checkCondition(success, failure).then(resolve).catch(reject);
        }, 1000);
    });
}

var i = 0;
checkCondition(
    () => {
        i++;
        return i > 5;
    },
    () => false
).then(() => {
    console.log(1);
});
