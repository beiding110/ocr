// 清理图片边界上存在的颜色
module.exports = function clearBoundaryColor(image) {
    const { data, width, height } = image.bitmap,
        boundarySize = 4,
        colors = [];

    // 标记颜色
    for (let i = 0; i < data.length; i += 4) {
        let rowIndex = Math.floor(i / 4 / width),
            colIndex = (i / 4) % width;

        if (
            rowIndex < boundarySize ||
            rowIndex + boundarySize === height ||
            colIndex < boundarySize ||
            colIndex + boundarySize === width
        ) {
            colors.push([data[i], data[i + 1], data[i + 2]]);
        }
    }

    // 替换颜色
    for (let i = 0; i < data.length; i += 4) {
        if (
            colors.some(([r, g, b]) => {
                return r === data[i] && g === data[i + 1] && b === data[i + 2];
            })
        ) {
            data[i] = data[i + 1] = data[i + 2] = 255;
        }
    }
};
