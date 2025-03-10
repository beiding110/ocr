const CaptchaRecognizer = require('../index.js');
const path = require('path');

console.log(CaptchaRecognizer);
console.log(typeof document);

function compareResult(result, answer) {
    if (result.toLowerCase() === answer.toLowerCase()) {
        return `${result} √`;
    }

    return `${result} × ${answer}`;
}

function buildFilePath(url) {
    return path.join(__dirname, url);
}

// 使用示例
(async () => {
    var ts = new Date().getTime();

    const recognizer = new CaptchaRecognizer({
        workerPath: buildFilePath('../node_modules/tesseract.js/src/worker-script/node/index.js'),
        langPath: buildFilePath('../tessdata-gh-pages/4.0.0_best'),
    });

    console.log('测试开始123');

    // const result0 = await recognizer.recognize(buildFilePath('../images/test0.png'));
    // console.log('识别结果0:', result0);

    const result1 = await recognizer.recognize(buildFilePath('../images/test1.png'));
    console.log('识别结果1:', compareResult(result1, 'NJBB'));

    const result2 = await recognizer.recognize(buildFilePath('../images/test2.png'));
    console.log('识别结果2:', compareResult(result2, 'AZSd'));

    const result3 = await recognizer.recognize(buildFilePath('../images/test3.png'));
    console.log('识别结果3:', compareResult(result3, '8MvHb'));

    const result4 = await recognizer.recognize(buildFilePath('../images/test4.png'));
    console.log('识别结果4:', compareResult(result4, 'vimowiy'));

    const result5 = await recognizer.recognize(buildFilePath('../images/test5.png'));
    console.log('识别结果5:', compareResult(result5, 'iucz5'));

    const result6 = await recognizer.recognize(buildFilePath('../images/test6.png'));
    console.log('识别结果6:', compareResult(result6, 'm3dv8'));

    // const result7 = await recognizer.recognize(buildFilePath('../images/test7.png'));
    // console.log('识别结果7:', result7);

    const result8 = await recognizer.recognize(buildFilePath('../images/test8.png'));
    console.log('识别结果8:', compareResult(result8, 'WXB4'));

    const result9 = await recognizer.recognize(buildFilePath('../images/test9.png'));
    console.log('识别结果9:', compareResult(result9, 'MGRg'));

    console.log(`耗时：${(new Date().getTime() - ts) / 1000}s`);
})();
