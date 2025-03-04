// 水平条纹检测方法
module.exports = function horizontalLineRemoval(image) {
    const { width, height, data } = image.bitmap;
    const temp = Buffer.from(data);
    const kernel = [
        [2, 2, 2],
        [0, 0, 0],
        [-2, -2, -2],
    ]; // 水平边缘检测核

    image.scan(0, 0, width, height, (x, y, idx) => {
        if (y < 1 || y >= height - 1) return;

        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
                const pixel = temp[((y + ky) * width + (x + kx)) * 4];
                sum += pixel * kernel[ky + 1][kx + 1];
            }
        }

        // 检测到强水平边缘时进行模糊
        if (Math.abs(sum) > 40) {
            image.bitmap.data[idx] =
                image.bitmap.data[idx + 1] =
                image.bitmap.data[idx + 2] =
                    (temp[(y - 1) * width * 4 + x * 4] + temp[(y + 1) * width * 4 + x * 4]) / 2;
        }
    });
};
