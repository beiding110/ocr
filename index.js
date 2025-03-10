const { Jimp } = require('jimp');
const Tesseract = require('tesseract.js');

const simpleBinarization = require('./utils/simpleBinarization.js');
const clearBoundaryColor = require('./utils/clearBoundaryColor.js');
const removeSmallAreas = require('./utils/removeSmallAreas.js');
const filterColor = require('./utils/filterColor.js');
const normalizeColor = require('./utils/normalizeColor.js');
const fillHole = require('./utils/fillHole.js');
const toolColorAnalysis = require('./utils/toolColorAnalysis.js');

class CaptchaRecognizer {
    constructor(obj) {
        this.worker = null;

        this.langPath = obj.path;
        this.workerPath  = obj.workerPath;
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
        let settings = {};

        if (this.langPath) {
            settings.langPath = this.langPath;
        }

        if (this.workerPath) {
            settings.workerPath = this.workerPath;
        }

        this.worker = await Tesseract.createWorker('eng', 1, {
            ...settings,
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

module.exports = CaptchaRecognizer;
