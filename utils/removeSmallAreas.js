// 连通域去噪（移除小面积区域）
const THRESHOLD_MIN_AREA = 0.035; // 连通域占图像像素比例，根据最小字符笔画宽度设定
const COLOR_SD = 25; // 色彩标准差，标准差内的色值将会被识别

/**
 * 连通域去噪（移除小面积区域）
 * 洪水填充识别独立区域
 * 面积阈值过滤（保留字符主体，消除离散噪点）
 */
module.exports = function removeSmallAreas(image) {
    const { width, height, data } = image.bitmap;
    const visited = Array(width * height).fill(false);
    const areas = [];

    var noArea = 0;

    // 连通域分析
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const area = floodFill(x, y, visited, image);

            if (area.pixels) {
                areas.push(area);
            } else {
                noArea++;
            }
        }
    }

    // console.log(areas.length);

    // console.log(
    //     areas.reduce((sum, cur) => {
    //         return sum + cur.points.length;
    //     }, 0)
    // );

    // console.log(noArea);

    // console.log(width * height);

    // console.log(areas);

    const combinedAreas = combineArea(areas),
        infoPointsPixels = combinedAreas.reduce((sum, cur) => {
            return sum + cur.pixels;
        }, 0);

    const areaThreshold = THRESHOLD_MIN_AREA < 1 ? infoPointsPixels * THRESHOLD_MIN_AREA : THRESHOLD_MIN_AREA;

    // console.log(areaThreshold);

    // console.log(combinedAreas.filter((a) => a.pixels > 0).length);

    // 移除小面积区域
    combinedAreas
        .filter((a) => a.pixels > 0)
        .filter((a) => a.pixels > 0 && a.pixels < areaThreshold)
        .forEach((area) => {
            area.points.forEach(([x, y]) => {
                const idx = (y * width + x) * 4;

                data[idx] = 255;
                data[idx + 1] = data[idx + 2] = 255;
            });
        });

    return {
        areas: areas.length, // 连通域个数
        combinedAreas: combinedAreas.length, // 按色值合并后的连通域个数
    };
};

// 标准差
function standardDeviation(color1, color2) {
    const [r1, g1, b1] = color1;
    const [r2, g2, b2] = color2;

    const diff = Math.sqrt((Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)) / 3);

    return diff;
}

/** 洪水填充算法
 */
function floodFill(startX, startY, visited, image) {
    const { width, height, data } = image.bitmap;

    const targetColor = [
        data[(startY * width + startX) * 4],
        data[(startY * width + startX) * 4 + 1],
        data[(startY * width + startX) * 4 + 2],
    ];

    const area = { pixels: 0, points: [], color: targetColor };
    const stack = [[startX, startY, targetColor]];

    // 这里操作的是非白色部分
    while (stack.length > 0) {
        const [x, y, centerColor] = stack.shift();

        const idx = y * width + x;

        if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;

        visited[idx] = true;

        const currentColor = [data[idx * 4], data[idx * 4 + 1], data[idx * 4 + 2]];

        if (standardDeviation([255, 255, 255], currentColor) < COLOR_SD) {
            // 白色连通域
            continue;
        }

        // if (currentColor[0] === 104 && currentColor[1] === 152 && currentColor[2] === 188) {
        //     console.log(x, y);
        // }

        // 颜色之间的标准差
        if (standardDeviation(currentColor, targetColor) < COLOR_SD) {
            area.pixels++;
            area.points.push([x, y]);

            Array.prototype.push.apply(stack, [
                [x + 1, y, currentColor], // 右
                [x - 1, y, currentColor], // 左
                [x, y + 1, currentColor], // 下
                [x, y - 1, currentColor], // 上
                [x - 1, y - 1, currentColor], // 左上
                [x + 1, y - 1, currentColor], // 右上
                [x - 1, y + 1, currentColor], // 左下
                [x + 1, y + 1, currentColor], // 右下
            ]);
        } else {
            // 这部分是边界

            visited[idx] = false;
        }
    }

    return area;
}

// 进行一次色值合并
function combineArea(areas) {
    if (!areas || !areas.length) {
        return [];
    }

    let combinedAreas = [];

    areas.forEach((area) => {
        let { pixels, points, color } = area;

        let index = combinedAreas.findIndex((item) => {
            return standardDeviation(item.color, color) < COLOR_SD;
        });

        if (index > -1) {
            combinedAreas[index].pixels += pixels;
            Array.prototype.push.apply(combinedAreas[index].points, points);
        } else {
            combinedAreas.push(area);
        }
    });

    combinedAreas.sort((a, b) => a.pixels - b.pixels);

    // console.log(combinedAreas.length);
    // console.log(combinedAreas);

    return combinedAreas;
}
