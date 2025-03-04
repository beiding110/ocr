const { createWorker, PSM } = require('tesseract.js');
const path = require('path');

(async () => {
    const worker = await createWorker(['eng'], 1, {
        langPath: path.resolve(__dirname, './tessdata-gh-pages/4.0.0_best'),
    });

    await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
    });

    const ret = await worker.recognize(path.resolve(__dirname, './test2-clean.png'));
    console.log(ret);
    console.log(ret.data.text);
    await worker.terminate();
})();
