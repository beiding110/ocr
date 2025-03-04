// 简单二值化
const threshold = 200;

module.exports = function simpleBinarization(image) {
    const { data } = image.bitmap;

    for (let i = 0; i < data.length; i += 4) {
        const value = data[i] <= threshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = value;
    }
};
