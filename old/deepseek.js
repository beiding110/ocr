const { Jimp } = require('jimp');
const Tesseract = require('tesseract.js');
const path = require('path');

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

class CaptchaRecognizer {
    constructor() {
        this.worker = null;

        this.config = {
            gaussianRadius: 1, // 高斯模糊半径
            medianKernelSize: 3, // 中值滤波核尺寸
            morphKernelSize: 2, // 形态学操作核尺寸
            minAreaThreshold: 15, // 连通域最小面积阈值
        };
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

        // 颜色标准化和对比度增强
        // this.normalizeColor(image);

        // 1. 灰度化
        // image.greyscale();

        // 清除边界颜色
        this.clearBoundaryColor(image);

        // 过滤颜色
        this.filterColor(image, [110, 110, 110], 40);

        // 2. 降噪（中值滤波）
        // this.medianFilter(image);

        // 3. 二值化（使用Otsu算法自动计算阈值）
        // this.otsuBinarization(image);

        // 高斯模糊（降噪）
        // image.gaussian(this.config.gaussianRadius);

        // 自适应直方图均衡化
        // image.contrast(0.2);

        // 形态学修复（开运算）
        // this.morphologicalOpen(image);

        // 连通域去噪
        // this.removeSmallAreas(image);

        // 直方图均衡化（增强对比度）
        // image.normalize();

        //
        // this.simpleBinarization(image);
        // this.otsuBinarization(image);
        //

        // this.morphologicalOpen(image);

        // this.medianFilter(image);
        // image.gaussian(this.config.gaussianRadius);

        // this.otsuBinarization(image);
        // this.medianFilter(image);

        // this.simpleBinarization(image, 120);

        // this.otsuBinarization(image);

        // 4. 可选：保存处理后的图像用于调试
        await image.write(imagePath.replace('.png', '-clean.png'));

        return image;
    }

    // 中值滤波降噪
    medianFilter(image) {
        const kernelSize = this.config.medianKernelSize;
        const edge = Math.floor(kernelSize / 2);
        const { width, height, data } = image.bitmap;
        const tempData = Buffer.from(data); // 创建数据副本

        image.scan(0, 0, width, height, (x, y, idx) => {
            const neighborPixels = [];
            for (let ky = -edge; ky <= edge; ky++) {
                for (let kx = -edge; kx <= edge; kx++) {
                    const cx = clamp(x + kx, 0, width - 1);
                    const cy = clamp(y + ky, 0, height - 1);
                    const pixelIdx = (cy * width + cx) * 4;
                    neighborPixels.push(tempData[pixelIdx]);
                }
            }
            neighborPixels.sort((a, b) => a - b);
            const median = neighborPixels[Math.floor(neighborPixels.length / 2)];

            // 直接修改像素数据
            image.bitmap.data[idx] = median;
            image.bitmap.data[idx + 1] = median;
            image.bitmap.data[idx + 2] = median;
        });
    }

    // Otsu二值化算法
    otsuBinarization(image) {
        const { data } = image.bitmap;
        const histogram = new Array(256).fill(0);

        // 计算直方图（直接遍历数据）
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        // 计算最佳阈值（原算法保持不变）
        let total = data.length / 4;
        let sum = histogram.reduce((s, v, i) => s + i * v, 0);

        let sumB = 0,
            wB = 0,
            maxVariance = 0,
            threshold = 0;

        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            const wF = total - wB;
            if (wF === 0) break;

            sumB += t * histogram[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const variance = wB * wF * (mB - mF) ** 2;

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }

        // 应用阈值（直接操作数据）
        for (let i = 0; i < data.length; i += 4) {
            const value = data[i] <= threshold ? 0 : 255;
            data[i] = data[i + 1] = data[i + 2] = value;
        }
    }

    // 简单二值化
    simpleBinarization(image, threshold = 200) {
        const { data } = image.bitmap;

        for (let i = 0; i < data.length; i += 4) {
            const value = data[i] <= threshold ? 0 : 255;
            data[i] = data[i + 1] = data[i + 2] = value;
        }
    }

    // 清理图片边界上存在的颜色
    clearBoundaryColor(image) {
        const { data, width, height } = image.bitmap,
            boundarySize = 6,
            colors = [];

        // 标记颜色
        for (let i = 0; i < data.length; i += 4) {
            let rowIndex = Math.floor(i / 4 / width),
                colIndex = (i / 4) % width;

            if (
                rowIndex < boundarySize ||
                rowIndex + boundarySize === height ||
                colIndex < boundarySize ||
                colIndex + boundarySize === width
            ) {
                colors.push([data[i], data[i + 1], data[i + 2]]);
            }
        }

        // 替换颜色
        for (let i = 0; i < data.length; i += 4) {
            if (
                colors.some(([r, g, b]) => {
                    return r === data[i] && g === data[i + 1] && b === data[i + 2];
                })
            ) {
                data[i] = data[i + 1] = data[i + 2] = 255;
            }
        }
    }

    // 形态学开运算（先腐蚀后膨胀）
    morphologicalOpen(image) {
        const kernel = this.createMorphKernel();
        this.erode(image, kernel);
        this.dilate(image, kernel);
    }

    // 创建形态学操作核
    createMorphKernel() {
        const size = this.config.morphKernelSize;
        return Array(size)
            .fill()
            .map(() => Array(size).fill(1));
    }

    // 腐蚀操作
    erode(image, kernel) {
        this.applyMorphOperation(image, kernel, Math.min);
    }

    // 膨胀操作
    dilate(image, kernel) {
        this.applyMorphOperation(image, kernel, Math.max);
    }

    // 形态学通用操作
    applyMorphOperation(image, kernel, operation) {
        const { width, height, data } = image.bitmap;
        const temp = Buffer.from(data);
        const kSize = kernel.length;
        const offset = Math.floor(kSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let values = [];
                for (let ky = 0; ky < kSize; ky++) {
                    for (let kx = 0; kx < kSize; kx++) {
                        const px = x + kx - offset;
                        const py = y + ky - offset;
                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const idx = (py * width + px) * 4;
                            values.push(temp[idx]);
                        }
                    }
                }
                const result = operation(...values);
                const idx = (y * width + x) * 4;
                image.bitmap.data[idx] = result;
                image.bitmap.data[idx + 1] = result;
                image.bitmap.data[idx + 2] = result;
            }
        }
    }

    // 连通域去噪（移除小面积区域）
    removeSmallAreas(image) {
        const { width, height, data } = image.bitmap;
        const visited = Array(width * height).fill(false);
        const areas = [];

        // 连通域分析
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (!visited[idx] && data[idx * 4] === 255) {
                    const area = this.floodFill(x, y, visited, image);
                    areas.push(area);
                }
            }
        }

        // 移除小面积区域
        areas
            .filter((a) => a.pixels < this.config.minAreaThreshold)
            .forEach((area) => {
                area.points.forEach(([x, y]) => {
                    const idx = (y * width + x) * 4;
                    data[idx] = data[idx + 1] = data[idx + 2] = 0;
                });
            });
    }

    // 洪水填充算法
    floodFill(startX, startY, visited, image) {
        const { width, height, data } = image.bitmap;
        const stack = [[startX, startY]];
        const area = { pixels: 0, points: [] };

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;

            visited[idx] = true;
            if (data[(y * width + x) * 4] === 255) {
                area.pixels++;
                area.points.push([x, y]);
                [
                    [x + 1, y],
                    [x - 1, y],
                    [x, y + 1],
                    [x, y - 1],
                ].forEach((p) => stack.push(p));
            }
        }
        return area;
    }

    // 过滤颜色
    filterColor(image, targetColor = [150, 150, 150], threshold = 10) {
        const { data } = image.bitmap;

        for (let i = 0; i < data.length; i += 4) {
            // const colorDiff = Math.sqrt(
            //     Math.pow(data[i] - targetColor[0], 2) +
            //         Math.pow(data[i + 1] - targetColor[1], 2) +
            //         Math.pow(data[i + 2] - targetColor[2], 2)
            // );

            // if (colorDiff < threshold) {
            //     // 将干扰色转为背景
            //     data[i] = data[i + 1] = data[i + 2] = 255;
            // }

            if (
                Math.abs(data[i] - targetColor[0]) < threshold &&
                Math.abs(data[i + 1] - targetColor[1]) < threshold &&
                Math.abs(data[i + 2] - targetColor[3]) < threshold
            ) {
                data[i] = data[i + 1] = data[i + 2] = 255;
            }
        }
    }

    // 颜色标准化和对比度增强
    normalizeColor(image) {
        const { width, height, data } = image.bitmap;
        let rMin = 255,
            rMax = 0;
        let gMin = 255,
            gMax = 0;
        let bMin = 255,
            bMax = 0;

        // 第一遍扫描：获取各通道极值
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            rMin = Math.min(rMin, r);
            rMax = Math.max(rMax, r);
            gMin = Math.min(gMin, g);
            gMax = Math.max(gMax, g);
            bMin = Math.min(bMin, b);
            bMax = Math.max(bMax, b);
        }

        // 计算通道拉伸系数
        const rRange = rMax - rMin || 1; // 避免除零
        const gRange = gMax - gMin || 1;
        const bRange = bMax - bMin || 1;

        // 第二遍扫描：应用线性拉伸
        for (let i = 0; i < data.length; i += 4) {
            // 通道归一化
            data[i] = Math.round(((data[i] - rMin) / rRange) * 255); // Red
            data[i + 1] = Math.round(((data[i + 1] - gMin) / gRange) * 255); // Green
            data[i + 2] = Math.round(((data[i + 2] - bMin) / bRange) * 255); // Blue

            // 增强对比度（可选）
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const contrast = 1.2; // 对比度系数，可配置
            data[i] = Math.min(255, Math.max(0, (data[i] - avg) * contrast + avg));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - avg) * contrast + avg));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - avg) * contrast + avg));
        }

        // 亮度补偿（解决过暗/过亮问题）
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < data.length; i += 4) {
            const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            histogram[Math.round(luminance)]++;
        }

        // 自动亮度调整（直方图5%～95%区间拉伸）
        let sum = 0;
        let lowThreshold = 0;
        let highThreshold = 255;
        const totalPixels = width * height;

        // 找低阈值（5%）
        for (let i = 0; i < 256; i++) {
            sum += histogram[i];
            if (sum >= totalPixels * 0.05) {
                lowThreshold = i;
                break;
            }
        }

        // 找高阈值（95%）
        sum = 0;
        for (let i = 255; i >= 0; i--) {
            sum += histogram[i];
            if (sum >= totalPixels * 0.05) {
                highThreshold = i;
                break;
            }
        }

        // 应用亮度补偿
        const lumRange = highThreshold - lowThreshold || 1;
        for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            const scale = (lum - lowThreshold) / lumRange;

            data[i] = Math.min(255, Math.max(0, data[i] * scale));
            data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * scale));
            data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * scale));
        }
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
            return text.replace(/\s+/g, '').toUpperCase();
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
    const recognizer = new CaptchaRecognizer();

    const result = await recognizer.recognize('test.png');
    console.log('识别结果1:', result);

    const result2 = await recognizer.recognize('test2.png');
    console.log('识别结果2:', result2);

    const result3 = await recognizer.recognize('test3.png');
    console.log('识别结果3:', result3);

    const result4 = await recognizer.recognize('test4.png');
    console.log('识别结果4:', result4);
})();
