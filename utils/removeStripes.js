const fft = require('fft-js');
const { Jimp } = require('jimp');

module.exports = function removeStripes(image) {
    // 确保图像尺寸是2的幂（FFT优化要求）
    const paddedImage = padImageToPowerOfTwo(image.clone());

    const grayData = getGrayData(paddedImage);
    const spectrum = fft2d(grayData);

    // 频域滤波：消除水平条纹（中间3行）
    const centerY = Math.floor(spectrum.length / 2);
    const filterHeight = 1; // 更保守的滤波范围

    for (let y = centerY - filterHeight; y <= centerY + filterHeight; y++) {
        if (y >= 0 && y < spectrum.length) {
            for (let x = 0; x < spectrum[y].length; x++) {
                // 修复spectrum[0]可能未定义的问题
                if (spectrum[y][x]) {
                    // 安全校验
                    spectrum[y][x] = [0, 0];
                }
            }
        }
    }

    const processed = ifft2d(spectrum);

    // 裁剪回原始尺寸并更新图像数据
    const { width, height } = image.bitmap;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // 添加溢出保护
            const val = clamp(Math.round(processed[y][x] * 255), 0, 255);
            image.bitmap.data[idx] = val;
            image.bitmap.data[idx + 1] = val;
            image.bitmap.data[idx + 2] = val;
        }
    }
};

// 新增关键修复函数
function padImageToPowerOfTwo(image) {
    const originalWidth = image.bitmap.width;
    const originalHeight = image.bitmap.height;

    // 计算最接近的2的幂
    const newWidth = Math.pow(2, Math.ceil(Math.log2(originalWidth)));
    const newHeight = Math.pow(2, Math.ceil(Math.log2(originalHeight)));

    // 创建新图像并进行边缘镜像填充
    const newImage = new Jimp({
        width: newWidth,
        height: newHeight,
    });

    // 将原图复制到新图中心
    const xOffset = Math.floor((newWidth - originalWidth) / 2);
    const yOffset = Math.floor((newHeight - originalHeight) / 2);
    newImage.blit(image, xOffset, yOffset);

    // 边缘镜像填充
    mirrorFill(newImage, xOffset, yOffset, originalWidth, originalHeight);
    return newImage;
}

function mirrorFill(image, xOffset, yOffset, srcWidth, srcHeight) {
    // 左右镜像填充
    for (let y = 0; y < srcHeight; y++) {
        for (let x = 0; x < xOffset; x++) {
            const srcX = xOffset + (xOffset - x - 1);
            const color = image.getPixelColor(srcX, y + yOffset);
            image.setPixelColor(color, x, y + yOffset);
        }
        for (let x = xOffset + srcWidth; x < image.bitmap.width; x++) {
            const srcX = xOffset + srcWidth - 1 - (x - (xOffset + srcWidth));
            const color = image.getPixelColor(srcX, y + yOffset);
            image.setPixelColor(color, x, y + yOffset);
        }
    }

    // 上下镜像填充
    for (let x = 0; x < image.bitmap.width; x++) {
        for (let y = 0; y < yOffset; y++) {
            const srcY = yOffset + (yOffset - y - 1);
            const color = image.getPixelColor(x, srcY);
            image.setPixelColor(color, x, y);
        }
        for (let y = yOffset + srcHeight; y < image.bitmap.height; y++) {
            const srcY = yOffset + srcHeight - 1 - (y - (yOffset + srcHeight));
            const color = image.getPixelColor(x, srcY);
            image.setPixelColor(color, x, y);
        }
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// 修正后的fft2d函数
function fft2d(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    // 行变换（添加长度校验）
    const rowTransformed = matrix.map((row) => {
        if (!row || row.length !== cols) {
            throw new Error('Invalid matrix dimensions');
        }
        const complexRow = row.map((v) => (Array.isArray(v) ? v : [v, 0]));
        return fft.fft(complexRow);
    });

    // 列变换准备（严格初始化二维数组）
    const colData = Array.from({ length: cols }, () =>
        Array.from(
            { length: rows },
            (x, y) => rowTransformed[y]?.[x] || [0, 0] // 安全访问
        )
    );

    // 列变换
    const colTransformed = colData.map((column) => {
        if (column.length !== rows) {
            throw new Error('Column length mismatch');
        }
        return fft.fft(column);
    });

    // 转置回原始维度（使用预分配数组）
    const result = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [0, 0]));

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            result[y][x] = colTransformed[x][y] || [0, 0]; // 防御性编程
        }
    }

    return result;
}

// 修正后的ifft2d函数
function ifft2d(matrix) {
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;

    // 列逆变换准备（严格初始化）
    const colData = Array.from({ length: cols }, () =>
        Array.from(
            { length: rows },
            (x, y) => matrix[y]?.[x] || [0, 0] // 安全访问
        )
    );

    // 逆列变换
    const colTransformed = colData.map((column) => {
        if (column.length !== rows) {
            throw new Error('Invalid column length');
        }
        return fft.ifft(column);
    });

    // 转置回行维度
    const rowData = Array.from({ length: rows }, () => Array.from({ length: cols }, () => [0, 0]));

    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            rowData[y][x] = colTransformed[x][y] || [0, 0];
        }
    }

    // 逆行变换
    const result = rowData.map((row) => {
        if (row.length !== cols) {
            throw new Error('Invalid row length');
        }
        return fft.ifft(row);
    });

    // 归一化并提取实部（添加数值稳定性处理）
    const scale = 1 / (rows * cols);
    return result.map((row) =>
        row.map((complex) => {
            const real = complex?.[0] ?? 0;
            return clamp(real * scale, -1, 1) * 0.5 + 0.5; // 映射到0-1范围
        })
    );
}

function getGrayData(image) {
    const { width, height, data } = image.bitmap;
    const grayMatrix = new Array(height);

    // 使用亮度公式进行灰度化（优化计算性能）
    for (let y = 0; y < height; y++) {
        grayMatrix[y] = new Float32Array(width);
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            // 使用整数运算优化公式：0.299R + 0.587G + 0.114B ≈ (R*19595 + G*38469 + B*7472) >> 16
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            grayMatrix[y][x] = (r * 19595 + g * 38469 + b * 7472) >>> 16;
        }
    }

    // 矩阵标准化（归一化到0-1范围）
    normalizeMatrix(grayMatrix);
    return grayMatrix;
}

function normalizeMatrix(matrix) {
    let min = Infinity,
        max = -Infinity;

    // 第一遍扫描找极值
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            min = Math.min(min, matrix[y][x]);
            max = Math.max(max, matrix[y][x]);
        }
    }

    // 第二遍扫描进行归一化
    const range = max - min || 1; // 防止除零错误
    for (let y = 0; y < matrix.length; y++) {
        for (let x = 0; x < matrix[y].length; x++) {
            matrix[y][x] = (matrix[y][x] - min) / range;
        }
    }
}
