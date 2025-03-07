// 清理图片边界上存在的颜色
const BOUNDARY_SIZE = 4; // 判定为边界的像素个数

module.exports = function clearBoundaryColor(image) {
    const { data, width, height } = image.bitmap,
        colors = [];

    // 标记颜色
    for (let i = 0; i < data.length; i += 4) {
        let rowIndex = Math.floor(i / 4 / width),
            colIndex = (i / 4) % width;

        if (
            rowIndex < BOUNDARY_SIZE ||
            rowIndex + BOUNDARY_SIZE === height ||
            colIndex < BOUNDARY_SIZE ||
            colIndex + BOUNDARY_SIZE === width
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
