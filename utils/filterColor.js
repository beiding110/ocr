// 过滤颜色
const NEUTRAL_COLOR_THRESHOLD = 70; // rgb差值在这个范围内的，将会判断为中性色进行移除
const NEUTRAL_COLOR_AREA = [100, 200]; // rgb取值在这个范围内的，才会作为中性色参与判断

module.exports = function filterColor(image) {
    const { data } = image.bitmap;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i],
            g = data[i + 1],
            b = data[i + 2];

        // 纯白色不处理
        if (r === 255 && g === 255 && b === 255) {
            continue;
        }

        // 将亮度过高的颜色转为背景
        if (r > 190 && g > 190 && b > 190) {
            data[i] = data[i + 1] = data[i + 2] = 255;
        }

        // 去除中性色
        if (
            Math.abs(r - g) < NEUTRAL_COLOR_THRESHOLD &&
            Math.abs(r - b) < NEUTRAL_COLOR_THRESHOLD &&
            Math.abs(b - g) < NEUTRAL_COLOR_THRESHOLD &&
            r > NEUTRAL_COLOR_AREA[0] &&
            r < NEUTRAL_COLOR_AREA[1] &&
            g > NEUTRAL_COLOR_AREA[0] &&
            g < NEUTRAL_COLOR_AREA[1] &&
            b > NEUTRAL_COLOR_AREA[0] &&
            b < NEUTRAL_COLOR_AREA[1]
        ) {
            data[i] = data[i + 1] = data[i + 2] = 255;
        }
    }
};
