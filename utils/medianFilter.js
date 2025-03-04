// 中值滤波降噪
const medianKernelSize = 3;

module.exports = function medianFilter(image) {
    const kernelSize = medianKernelSize;
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
};

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
