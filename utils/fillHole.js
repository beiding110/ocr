const ROUND_X = [-1, 0, 1];
const ROUND_Y = [-1, 0, 1];

module.exports = function (image) {
    const { width, height, data } = image.bitmap;

    // 扩散
    dilate(width, height, data);
    // dilate(width, height, data);
    // dilate(width, height, data);
    // 收缩
    erode(width, height, data);
    // erode(width, height, data);
    // erode(width, height, data);
};

function findBorderPoints(width, height, data) {
    const borderPoints = [],
        borderOuterPoints = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;

            let r = data[idx],
                g = data[idx + 1],
                b = data[idx + 2];

            if (r === 255 && g === 255 && b === 255) {
                // 背景色
                continue;
            }

            // 是否是边界
            for (let ry = 0; ry < ROUND_Y.length; ry++) {
                for (let rx = 0; rx < ROUND_X.length; rx++) {
                    let posX = x + ROUND_X[rx],
                        posY = y + ROUND_Y[ry];

                    if (posX > 0 && posX < width && posY > 0 && posY < height) {
                        // 在长宽范围内

                        let ridx = (width * posY + posX) * 4,
                            rr = data[ridx],
                            rg = data[ridx + 1],
                            rb = data[ridx + 2];

                        if (rr !== r && rg !== g && rb !== b) {
                            // 相邻的颜色和中心颜色不同

                            if (
                                !borderPoints.some((item) => {
                                    return item[0] === x && item[1] === y;
                                })
                            ) {
                                borderPoints.push([x, y]);
                            }

                            if (
                                !borderOuterPoints.some((item) => {
                                    return item[0] === posX && item[1] === posY;
                                })
                            ) {
                                borderOuterPoints.push([posX, posY, [r, g, b]]);
                            }
                        }
                    }
                }
            }
        }
    }

    return {
        borderPoints,
        borderOuterPoints,
    };
}

// 膨胀
function dilate(width, height, data) {
    const { borderOuterPoints } = findBorderPoints(width, height, data);

    borderOuterPoints.forEach(([x, y, color]) => {
        let idx = (y * width + x) * 4;

        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
    });
}

// 侵蚀
function erode(width, height, data) {
    const { borderPoints } = findBorderPoints(width, height, data);

    borderPoints.forEach(([x, y]) => {
        let idx = (y * width + x) * 4;

        data[idx] = data[idx + 1] = data[idx + 2] = 255;
    });
}
