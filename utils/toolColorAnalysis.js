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

    return {
        groups: getGroup(histogramGrey),
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

    let firstNotZeroIndex = 0;
    let minOfEffectiveHistogram = 9999,
        maxOfEffectiveHistogram = 0;

    effectiveHistogram.reverse().forEach((item, index) => {
        // 区域最小范围
        if (item.length) {
            firstNotZeroIndex = index;
        }
    });

    firstNotZeroIndex = 240 - firstNotZeroIndex - 1;

    // 重新定义起始点
    // 将所有值减去最小值
    effectiveHistogram = effectiveHistogram
        .reverse()
        .slice(firstNotZeroIndex)
        .map((item) => {
            // 取最小值
            minOfEffectiveHistogram = Math.min(item.length, minOfEffectiveHistogram);

            // 取最大值
            maxOfEffectiveHistogram = Math.max(item.length, maxOfEffectiveHistogram);

            return item;
        })
        .map((item) => {
            return item.length - minOfEffectiveHistogram;
        });

    // 计算连通域个数
    let groupNum = 0;
    // console.log(minOfEffectiveHistogram, maxOfEffectiveHistogram);

    for (let i = 0; i < effectiveHistogram.length; i++) {
        let prev = effectiveHistogram[i - 1],
            current = effectiveHistogram[i],
            next = effectiveHistogram[i + 1];

        if (i > 0 && prev > 0 && current === 0) {
            groupNum++;
        }

        if (current === 0 && next > 0 && next < 10) {
            effectiveHistogram[i + 1] = 0;
        }
    }

    // console.log(JSON.stringify(effectiveHistogram));

    // console.log(groupNum);

    return groupNum;
}
