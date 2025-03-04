// 颜色标准化和对比度增强
const contrast = 1.43; // 对比度系数，可配置。【1.0-2.0】值越大对比度越强，但可能产生色阶断裂
const blackPoint = 0.01; // 直方图暗部裁剪比例【1%-10%】值越小保留的细节越多，抗噪能力越弱
const whitePoint = 0.01; // 直方图亮部裁剪比例

module.exports = function normalizeColor(image) {
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
        if (sum >= totalPixels * blackPoint) {
            lowThreshold = i;
            break;
        }
    }

    // 找高阈值（95%）
    sum = 0;
    for (let i = 255; i >= 0; i--) {
        sum += histogram[i];
        if (sum >= totalPixels * whitePoint) {
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
};
