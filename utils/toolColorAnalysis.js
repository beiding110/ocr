const BREAK_GROUP_MIN_SPACE = 5; // 拆分分组的最小间隔，值以下的认为分组没被拆分

module.exports = function toolColorAnalysis(image) {
    const cImage = image.clone();

    const { width, height, data } = image.bitmap;
    const { data: grayData } = cImage.greyscale().bitmap;

    const histogramR = arrayFactory(256),
        histogramG = arrayFactory(256),
        histogramB = arrayFactory(256),
        histogramGrey = arrayFactory(256);

    image.scan(0, 0, width, height, (x, y, idx) => {
        // 色值直方图
        histogramR[data[idx]].push({ x, y, idx, value: data[idx] });
        histogramG[data[idx + 1]].push({ x, y, idx, value: data[idx + 1] });
        histogramB[data[idx + 2]].push({ x, y, idx, value: data[idx + 2] });

        // 灰度直方图
        histogramGrey[grayData[idx]].push({ x, y, idx, value: grayData[idx] });
    });

    // console.log(JSON.stringify(histogramR));
    // console.log(histogramG);
    // console.log(histogramB);

    // console.log(histogramGrey.filter(item => item <= 100).length);
    // console.log(histogramGrey.filter(item => item > 100).length);

    /**
    // 抹平240以上的部分
    histogramGrey.forEach((pixels, index) => {
        if (index < 240) {
            return;
        }

        pixels.forEach((item) => {
            const { idx, value } = item;

            // data[idx] = data[idx + 1] = data[idx + 2] = 255;

            if (index !== 255) {
                histogramGrey[255].push(item);
            }
        });

        if (index !== 255) {
            histogramGrey[index] = [];
        }
    });

    console.log(JSON.stringify(histogramGrey.map((item) => item.length)));

    histogramGrey
        .sort((a, b) => a.length - b.length)
        .slice(0, 245)
        .forEach((pixels) => {
            pixels.forEach((item) => {
                const { idx, value } = item;

                data[idx] = data[idx + 1] = data[idx + 2] = 255;
            });
        });

    // 色差直方图

    */

    // getGroup(histogramR);
    // getGroup(histogramG);
    // getGroup(histogramB);

    const groups = getGroup(histogramGrey),
        middle = findMiddleNum(histogramGrey, image);

    return {
        groups,
        middle,
    };
};

function arrayFactory(num) {
    let arr = [];

    for (let i = 0; i < num; i++) {
        arr.push([]);
    }

    return arr;
}

function getGroup(histogram) {
    let effectiveHistogram = histogram.slice(0, 240);

    // 正向查非零起点
    for (let i = 0; i < effectiveHistogram.length; i++) {
        if (effectiveHistogram[i].length === 0) {
            effectiveHistogram.shift();
            i--;
        } else {
            break;
        }
    }

    // 反向查非零终点
    effectiveHistogram.reverse();

    for (let i = 0; i < effectiveHistogram.length; i++) {
        if (effectiveHistogram[i].length === 0) {
            effectiveHistogram.shift();
            i--;
        } else {
            break;
        }
    }

    // 数组复位
    effectiveHistogram.reverse();

    // 取直方图的最大最小值
    let minOfEffectiveHistogram = 9999,
        maxOfEffectiveHistogram = 0;

    effectiveHistogram.forEach((item) => {
        // 取最小值
        minOfEffectiveHistogram = Math.min(item.length, minOfEffectiveHistogram);

        // 取最大值
        maxOfEffectiveHistogram = Math.max(item.length, maxOfEffectiveHistogram);
    });

    // 去掉最小值
    effectiveHistogram = effectiveHistogram.map((item) => {
        return item.length - minOfEffectiveHistogram;
    });

    // 计算直方图连通域个数
    let groupNum = 0,
        groupArr = [],
        spaceArr = [];
    // console.log(minOfEffectiveHistogram, maxOfEffectiveHistogram);

    // 放一个终点，不然取不到最后一组值

    while (effectiveHistogram.length) {
        // 切割有值段（尾）
        let notZeroIndex = effectiveHistogram.findIndex((item) => item),
            spaceItem = effectiveHistogram.splice(0, notZeroIndex);

        if (spaceItem.length) {
            spaceArr.push(spaceItem);
        }

        // 切割无值段（头）
        let zeroIndex;

        if (!effectiveHistogram.includes(0)) {
            zeroIndex = effectiveHistogram.length;
        } else {
            zeroIndex = effectiveHistogram.findIndex((item) => !item);
        }

        let groupItem = effectiveHistogram.splice(0, zeroIndex);

        if (groupItem.length) {
            groupNum++;

            groupArr.push(groupItem);
        }
    }

    // 合并阈值以下的间隙
    if (BREAK_GROUP_MIN_SPACE) {
        spaceArr.forEach((item) => {
            if (item.length <= BREAK_GROUP_MIN_SPACE) {
                groupNum--;
            }
        });

        // 进行补偿
        if (spaceArr.length > groupArr.length) {
            // 0 1 0形式
            groupNum += 2;
        } else if (spaceArr.length === groupArr.length) {
            // 0 1 0 1 形式
            groupNum += 1;
        }
    }

    // console.log(JSON.stringify(effectiveHistogram));

    // console.log(groupNum);

    return groupNum;
}

function findMiddleNum(histogram, image) {
    let arr = [...histogram];

    arr = arr
        .sort((a, b) => {
            return a.length - b.length;
        })
        .filter((item) => {
            return item.length;
        });

    if (arr.length % 2 === 0) {
        return arr[arr.length / 2].length;
    }

    let larger = arr[Math.ceil(arr.length / 2)].length,
        smaller = arr[Math.floor(arr.length / 2)].length;

    // removePoints(image, arr.slice(0, Math.floor(arr.length / 2)));

    return (larger + smaller) / 2;
}

function removePoints(image, histogram) {
    const { data } = image.bitmap;

    histogram.forEach((points) => {
        points.forEach((item) => {
            let { idx } = item;

            data[idx] = data[idx + 1] = data[idx + 2] = 255;
        });
    });
}
