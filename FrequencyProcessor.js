const { Jimp, rgbaToInt } = require('jimp');
const fft = require('fft-js');

class FrequencyProcessor {
    constructor() {
        this.debugMode = true; // 调试模式开关
    }

    async process(imagePath) {
        // 1. 预处理阶段
        const original = await Jimp.read(imagePath);
        let image = original.clone();

        // 保存中间步骤用于调试
        await this.debugSave(image, '00_original.png');

        // 预处理管道
        image = await this.preprocess(image);

        // 2. 频域处理
        const filtered = await this.frequencyDomainProcess(image);

        // 3. 后处理阶段
        const final = await this.postprocess(filtered, original);

        return final;
    }

    async preprocess(img) {
        // 灰度化 + 对比度增强
        img.contrast(0.2);

        // 自适应尺寸调整（2的幂次）
        const processed = await this.adaptiveResize(img);

        await this.debugSave(processed, '01_preprocessed.png');
        return processed;
    }

    async frequencyDomainProcess(img) {
        // 转换为频域
        const { spectrum, rows, cols } = this.imageToSpectrum(img);

        // 频域滤波（关键步骤）
        this.applyFrequencyFilter(spectrum);

        // 频谱可视化
        if (this.debugMode) {
            await this.visualizeSpectrum(spectrum, '02_spectrum.png');
        }

        // 逆变换回空间域
        return this.spectrumToImage(spectrum, rows, cols);
    }

    async postprocess(filteredImg, original) {
        // 裁剪回原始尺寸
        const cropped = await this.cropToOriginal(filteredImg, original);

        // 降噪管道
        cropped
            .normalize() // 归一化
            .threshold({ max: 180 }); // 自适应二值化

        // 形态学修复
        this.morphologicalEnhance(cropped);

        await this.debugSave(cropped, '03_final.png');
        return cropped;
    }

    // 核心算法实现
    imageToSpectrum(img) {
        const matrix = this.imageToMatrix(img);
        const spectrum = this.fft2d(matrix);
        return {
            spectrum,
            rows: matrix.length,
            cols: matrix[0].length,
        };
    }

    imageToMatrix(img) {
        const { width, height } = img.bitmap;

        // 创建标准化矩阵缓冲区
        const matrix = new Float32Array(height * width);

        // 并行像素处理（使用Jimp像素迭代API优化性能）
        img.scan(0, 0, width, height, (x, y, idx) => {
            // 快速灰度转换公式（整数运算优化）
            const gray = Math.round(
                0.299 * img.bitmap.data[idx] + 0.587 * img.bitmap.data[idx + 1] + 0.114 * img.bitmap.data[idx + 2]
            );

            // 直接存入TypedArray提升性能
            matrix[y * width + x] = gray;
        });

        // 自动对比度拉伸（避免过拟合）
        const { min, max } = this.calcNormalizationParams(matrix);
        const range = max - min || 1; // 防止除零错误

        // 转换为二维数组并规范化
        return Array.from({ length: height }, (_, y) =>
            Array.from({ length: width }, (_, x) => {
                const value = (matrix[y * width + x] - min) / range;
                return this.applyGammaCorrection(value, 0.8); // Gamma校正增强暗部细节
            })
        );
    }

    // 辅助方法：计算归一化参数
    calcNormalizationParams(matrix) {
        let min = Infinity,
            max = -Infinity;
        for (let i = 0; i < matrix.length; i++) {
            min = Math.min(min, matrix[i]);
            max = Math.max(max, matrix[i]);
        }
        return { min, max };
    }

    // Gamma校正（增强暗部细节）
    applyGammaCorrection(value, gamma) {
        return Math.pow(value, gamma);
    }

    applyFrequencyFilter(spectrum) {
        const rows = spectrum.length;
        const cols = spectrum[0].length;
        const centerY = Math.floor(rows / 2);
        const centerX = Math.floor(cols / 2);

        // 消除垂直条纹（示例消除中心区域）
        const stripeWidth = 3;
        for (let y = centerY - stripeWidth; y <= centerY + stripeWidth; y++) {
            for (let x = 0; x < cols; x++) {
                if (y >= 0 && y < rows) {
                    spectrum[y][x] = [0, 0];
                }
            }
        }

        // 消除高频噪声（边缘区域）
        const noiseThreshold = 0.15 * Math.min(rows, cols);
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const dy = Math.abs(y - centerY);
                const dx = Math.abs(x - centerX);
                if (dx + dy > noiseThreshold) {
                    spectrum[y][x] = [0, 0];
                }
            }
        }
    }

    // 二维FFT实现
    fft2d(matrix) {
        const rows = matrix.length;
        const cols = matrix[0].length;

        // 行变换
        const rowTransformed = matrix.map((row) => fft.fft(row.map((v) => [v, 0])));

        // 列变换
        const colData = Array(cols)
            .fill()
            .map((_, x) =>
                Array(rows)
                    .fill()
                    .map((_, y) => rowTransformed[y][x])
            );
        const colTransformed = colData.map((col) => fft.fft(col));

        // 合并结果
        return Array(rows)
            .fill()
            .map((_, y) =>
                Array(cols)
                    .fill()
                    .map((_, x) => colTransformed[x][y])
            );
    }

    // 辅助方法
    async adaptiveResize(img) {
        const width = nextPowerOfTwo(img.bitmap.width);
        const height = nextPowerOfTwo(img.bitmap.height);

        const canvas = new Jimp({ width, height });

        canvas.blit(img, (width - img.bitmap.width) / 2, (height - img.bitmap.height) / 2).normalize();

        return canvas;
    }

    morphologicalEnhance(img) {
        const kernel = [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1],
        ];
        img.convolute(kernel); // 自定义卷积操作需要实现
    }

    // 调试工具
    async debugSave(image, filename) {
        if (this.debugMode) {
            await image.write(filename);
        }
    }

    async visualizeSpectrum(spectrum, filename) {
        const max = spectrum.reduce(
            (max, row) => Math.max(max, ...row.map((c) => Math.sqrt(c[0] ** 2 + c[1] ** 2))),
            0
        );

        const spectrumImage = new Jimp({
            width: spectrum[0].length,
            height: spectrum.length,
        });
        spectrum.forEach((row, y) => {
            row.forEach((c, x) => {
                const magnitude = Math.sqrt(c[0] ** 2 + c[1] ** 2);
                const intensity = Math.min(255, (magnitude / max) * 255);
                spectrumImage.setPixelColor(rgbaToInt(intensity, intensity, intensity, 255), x, y);
            });
        });
        await spectrumImage.write(filename);
    }

    spectrumToImage(spectrum, originalRows, originalCols) {
        // 验证输入数据格式
        if (!Array.isArray(spectrum) || !spectrum[0] || !spectrum[0][0]) {
            throw new Error('Invalid spectrum format');
        }

        // 执行逆二维FFT
        const spatialData = this.ifft2d(spectrum);

        // 转换到图像空间
        return this.createImageFromMatrix(spatialData, originalRows, originalCols);
    }

    // 二维逆FFT核心算法
    ifft2d(spectrum) {
        const rows = spectrum.length;
        const cols = spectrum[0].length;

        // 列逆变换
        const colData = Array(cols)
            .fill()
            .map((_, x) =>
                Array(rows)
                    .fill()
                    .map((_, y) => spectrum[y][x])
            );
        const colTransformed = colData.map((col) => fft.ifft(col));

        // 行逆变换
        const rowData = Array(rows)
            .fill()
            .map((_, y) =>
                Array(cols)
                    .fill()
                    .map((_, x) => colTransformed[x][y])
            );
        const spatialComplex = rowData.map((row) => fft.ifft(row));

        // 归一化并提取实部
        const scale = 1 / (rows * cols);
        return spatialComplex.map((row) => row.map((complex) => complex[0] * scale));
    }

    // 从矩阵创建Jimp图像
    createImageFromMatrix(matrix, originalRows, originalCols) {
        const rows = matrix.length;
        const cols = matrix[0].length;

        const image = new Jimp({
            width: cols,
            height: rows,
        });

        // 转换矩阵到像素值
        const minMax = this.calcMatrixRange(matrix);
        const range = minMax.max - minMax.min || 1;

        image.scan(0, 0, cols, rows, (x, y, idx) => {
            // 归一化到0-255范围
            const normalized = (matrix[y][x] - minMax.min) / range;
            const pixelValue = Math.min(255, Math.max(0, normalized * 255));

            image.bitmap.data[idx] = pixelValue; // R
            image.bitmap.data[idx + 1] = pixelValue; // G
            image.bitmap.data[idx + 2] = pixelValue; // B
            image.bitmap.data[idx + 3] = 255; // Alpha
        });

        // 裁剪回原始尺寸（如果之前有填充）
        return this.cropImage(image, originalCols, originalRows);
    }

    // 辅助方法：计算矩阵数值范围
    calcMatrixRange(matrix) {
        let min = Infinity,
            max = -Infinity;
        matrix.forEach((row) => {
            row.forEach((value) => {
                min = Math.min(min, value);
                max = Math.max(max, value);
            });
        });
        return { min, max };
    }

    // 图像裁剪方法
    cropImage(image, targetWidth, targetHeight) {
        const xStart = Math.floor((image.bitmap.width - targetWidth) / 2);
        const yStart = Math.floor((image.bitmap.height - targetHeight) / 2);
        return image.crop({
            x: xStart,
            y: yStart,
            w: targetWidth,
            h: targetHeight,
        });
    }

    /**
     * 将处理后的图像裁剪回原始尺寸
     * @param {Jimp} processedImg 处理后的图像实例
     * @param {Jimp} originalImg 原始图像实例
     * @param {Object} options 配置选项
     * @returns {Promise<Jimp>} 裁剪后的图像
     */
    async cropToOriginal(processedImg, originalImg, options = {}) {
        const {
            paddingStrategy = 'mirror', // 填充策略记忆（mirror|black|white）
            allowScaling = false, // 是否允许缩放
        } = options;

        // 获取尺寸信息
        const origWidth = originalImg.bitmap.width;
        const origHeight = originalImg.bitmap.height;
        const procWidth = processedImg.bitmap.width;
        const procHeight = processedImg.bitmap.height;

        // 尺寸校验（带智能修复）
        if (procWidth < origWidth || procHeight < origHeight) {
            if (!allowScaling) {
                throw new Error(`处理图像尺寸不足 (${procWidth}x${procHeight}) < (${origWidth}x${origHeight})`);
            }
            return this._scaleToFit(processedImg, origWidth, origHeight);
        }

        // 计算安全裁剪区域
        const { x, y } = this._calculateSafeCrop(procWidth, procHeight, origWidth, origHeight, paddingStrategy);

        // 执行裁剪操作
        try {
            return processedImg
                .clone()
                .crop({
                    x,
                    y,
                    w: origWidth,
                    h: origHeight,
                });
        } catch (err) {
            throw new Error(`裁剪失败: ${err.message}`);
        }
    }

    // 私有方法：计算安全裁剪位置
    _calculateSafeCrop(procW, procH, origW, origH, paddingStrategy) {
        // 基础中心计算
        let x = Math.floor((procW - origW) / 2);
        let y = Math.floor((procH - origH) / 2);

        // 边界保护
        x = Math.max(0, Math.min(x, procW - origW));
        y = Math.max(0, Math.min(y, procH - origH));

        // 根据填充策略微调（示例处理镜像填充）
        if (paddingStrategy === 'mirror') {
            const mirrorThreshold = Math.floor((procW - origW) / 4);
            if (x < mirrorThreshold) x += mirrorThreshold;
            if (x > procW - origW - mirrorThreshold) x -= mirrorThreshold;
        }

        return { x, y };
    }

    // 私有方法：缩放适配
    async _scaleToFit(image, targetW, targetH) {
        return new Promise((resolve, reject) => {
            image
                .clone()
                .cover(targetW, targetH, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE, (err, img) => {
                    err ? reject(err) : resolve(img);
                });
        });
    }
}

// 工具函数
function nextPowerOfTwo(n) {
    return 1 << Math.ceil(Math.log2(n));
}

// 使用示例
(async () => {
    const processor = new FrequencyProcessor();
    const result = await processor.process('test1.png');
    await result.write('result.png');
})();
