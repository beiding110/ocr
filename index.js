const { Jimp } = require('jimp');
const Tesseract = require('tesseract.js');
const path = require('path');

const simpleBinarization = require('./utils/simpleBinarization.js');
const clearBoundaryColor = require('./utils/clearBoundaryColor.js');
const removeSmallAreas = require('./utils/removeSmallAreas.js');
const filterColor = require('./utils/filterColor.js');
const normalizeColor = require('./utils/normalizeColor.js');
const fillHole = require('./utils/fillHole.js');
const toolColorAnalysis = require('./utils/toolColorAnalysis.js');

class CaptchaRecognizer {
    constructor() {
        this.worker = null;
    }

    async terminate() {
        if (this.worker) {
            // 使用正确的终止方法
            await this.worker.terminate();
            this.worker = null;
        }
    }

    // 图像预处理管道
    async preprocessImage(imagePath) {
        const image = await Jimp.read(imagePath);

        // 清除边界颜色
        clearBoundaryColor(image);

        // 统一图片大小
        image.scaleToFit({ w: 500, h: 500 });

        // 过滤所有值都在200以上的颜色
        filterColor(image);

        // 进行色值分析，以确定后续处理的步骤
        const { groups } = toolColorAnalysis(image);

        // 颜色标准化和对比度增强
        // 色彩太多就不标准化了？
        // 削弱了2，增强了3/4，对156无效
        if (groups < 2) {
            normalizeColor(image);
        }

        // 连通域去噪
        const { combinedAreas } = removeSmallAreas(image);

        // 二值化（使用Otsu算法自动计算阈值）
        // otsuBinarization(image);
        simpleBinarization(image);

        // 形态学修复（开运算）
        fillHole(image);

        // 高斯模糊（降噪，低频滤波）
        let gaussianNum = 4;

        if (combinedAreas / groups < 10) {
            // 色值跨度不大
            gaussianNum = 3;
        }
        image.gaussian(gaussianNum);

        image.scaleToFit({ w: 100, h: 100 });

        // 4. 可选：保存处理后的图像用于调试
        // await image.write(imagePath.replace('.png', '-clean.png'));

        return image;
    }

    async recognize(imagePath) {
        this.worker = await Tesseract.createWorker('eng', 1, {
            langPath: path.resolve(__dirname, './tessdata-gh-pages/4.0.0_best'),
            // logger: (m) => console.log(m), // 可选日志记录
        });

        await this.worker.setParameters({
            tessedit_char_whitelist: '012345689abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        });

        try {
            const processedImage = await this.preprocessImage(imagePath);

            // 将处理后的图像转换为buffer
            const imageBuffer = await processedImage.getBuffer('image/png');

            // 使用Tesseract进行OCR识别
            const {
                data: { text },
            } = await this.worker.recognize(imageBuffer);

            // 后处理：清理识别结果
            return text.replace(/\s+/g, '');
        } catch (e) {
            console.error(e);
        } finally {
            // 确保终止Worker
            await this.terminate();
        }
    }
}

// 使用示例
(async () => {
    var ts = new Date().getTime();

    function compareResult(result, answer) {
        if (result.toLowerCase() === answer.toLowerCase()) {
            return `${result} √`;
        }

        return `${result} × ${answer}`;
    }

    const recognizer = new CaptchaRecognizer();

    // const result0 = await recognizer.recognize('test0.png');
    // console.log('识别结果0:', result0);

    const result1 = await recognizer.recognize('./images/test1.png');
    console.log('识别结果1:', compareResult(result1, 'NJBB'));

    const result2 = await recognizer.recognize('./images/test2.png');
    console.log('识别结果2:', compareResult(result2, 'AZSd'));

    const result3 = await recognizer.recognize('./images/test3.png');
    console.log('识别结果3:', compareResult(result3, '8MvHb'));

    const result4 = await recognizer.recognize('./images/test4.png');
    console.log('识别结果4:', compareResult(result4, 'vimowiy'));

    const result5 = await recognizer.recognize('./images/test5.png');
    console.log('识别结果5:', compareResult(result5, 'iucz5'));

    const result6 = await recognizer.recognize('./images/test6.png');
    console.log('识别结果6:', compareResult(result6, 'm3dv8'));

    // const result7 = await recognizer.recognize('./images/test7.png');
    // console.log('识别结果7:', result7);

    const result8 = await recognizer.recognize('./images/test8.png');
    console.log('识别结果8:', compareResult(result8, 'WXB4'));

    const result9 = await recognizer.recognize('./images/test9.png');
    console.log('识别结果9:', compareResult(result9, 'MGRg'));

    console.log(`耗时：${(new Date().getTime() - ts) / 1000}s`);
})();
