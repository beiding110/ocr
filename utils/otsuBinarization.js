// Otsu二值化算法
module.exports = function otsuBinarization(image) {
    const { data } = image.bitmap;
    const histogram = new Array(256).fill(0);

    const { data: grayData } = image.clone().greyscale().bitmap;

    // 计算直方图（直接遍历数据）
    for (let i = 0; i < grayData.length; i += 4) {
        histogram[grayData[i]]++;
    }

    // 计算最佳阈值（原算法保持不变）
    let total = grayData.length / 4;
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
};
