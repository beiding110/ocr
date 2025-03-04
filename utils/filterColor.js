// 过滤颜色

const threshold = 20; // 单值色差
const colorSD = 30; // 色值标准差

// 标准差
function standardDeviation(color1, color2) {
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;

    const diff = Math.sqrt((Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)) / 3);

    return diff;
}

// module.exports = function filterColor(image, targetColor = [150, 150, 150]) {
//     const { data } = image.bitmap;

//     for (let i = 0; i < data.length; i += 4) {
//         const colorDiff = standardDeviation(targetColor, [data[i], data[i + 1], data[i + 2]]);

//         if (colorDiff < colorSD) {
//             // 将干扰色转为背景
//             data[i] = data[i + 1] = data[i + 2] = 255;
//         }

//         // if (
//         //     Math.abs(data[i] - targetColor[0]) < threshold &&
//         //     Math.abs(data[i + 1] - targetColor[1]) < threshold &&
//         //     Math.abs(data[i + 2] - targetColor[2]) < threshold &&
//         //     colorDiff < standardDeviation
//         // ) {
//         //     console.log(data[i], data[i + 1], data[i + 2]);

//         //     data[i] = data[i + 1] = data[i + 2] = 255;
//         // }
//     }
// };

module.exports = function filterColor(image) {
    const { data } = image.bitmap;

    // 清除全部200以上色值的色块
    for (let i = 0; i < data.length; i += 4) {
        let r = data[i],
            g = data[i + 1],
            b = data[i + 2];

        if (r === 255 && g === 255 && b === 255) {
            continue;
        }

        if (r > 190 && g > 190 && b > 190) {
            // 将干扰色转为背景
            data[i] = data[i + 1] = data[i + 2] = 255;
        }

        // 去除中性色
        if (
            Math.abs(r - g) < threshold &&
            Math.abs(r - b) < threshold &&
            Math.abs(b - g) < threshold &&
            r > 100 &&
            r < 200 &&
            g > 100 &&
            g < 200 &&
            b > 100 &&
            b < 200
        ) {
            // 将干扰色转为背景
            data[i] = data[i + 1] = data[i + 2] = 255;
        }

        if (
            Math.abs(r - g) < 70 &&
            Math.abs(r - b) < 70 &&
            Math.abs(b - g) < 70 &&
            r > 100 &&
            r < 200 &&
            g > 100 &&
            g < 200 &&
            b > 100 &&
            b < 200
        ) {
            // 将干扰色转为背景
            data[i] = data[i + 1] = data[i + 2] = 255;
        }
    }
};
