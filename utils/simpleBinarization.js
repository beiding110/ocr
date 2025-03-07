// 简单二值化
const THRESHOLD_SET_BLACK = 210; // 小于等于该值的，直接设为黑色

module.exports = function simpleBinarization(image) {
    const { data } = image.bitmap,
        { data: grayData } = image.clone().greyscale().bitmap;

    for (let i = 0; i < data.length; i += 4) {
        const value = average(grayData[i], grayData[i + 1], grayData[i + 2]) <= THRESHOLD_SET_BLACK ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = value;
    }
};

function average(...args) {
    return (
        args.reduce((sum, cur) => {
            return sum + cur;
        }, 0) / args.length
    );
}
