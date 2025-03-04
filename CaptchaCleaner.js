const { Jimp } = require('jimp');

class CaptchaCleaner {
    constructor() {
        this.config = {
            lineThreshold: 15, // 线条最大宽度（像素）
            noiseThreshold: 10, // 噪点最大面积（像素）
            morphIterations: 2, // 形态学操作次数
            colorMargin: 30, // 颜色差异阈值
        };
    }

    async process(imagePath) {
        const image = await Jimp.read(imagePath);

        // 处理流程
        // this.preprocess(image);
        // await this.debugSave(image, '01_preprocessed.png');

        // this.removeLines(image);
        // await this.debugSave(image, '02_removed_lines.png');

        this.removeNoise(image);
        await this.debugSave(image, '03_removed_noise.png');

        return image;
    }

    preprocess(img) {
        // 灰度化 + 对比度增强
        img.threshold({ max: 150 }).contrast(0.3);

        // 自适应二值化
        this.adaptiveThreshold(img);
    }

    adaptiveThreshold(img) {
        const { width, height, data } = img.bitmap;
        const threshold = this.calculateOtsuThreshold(img);

        img.scan(0, 0, width, height, (x, y, idx) => {
            const gray = data[idx];
            data[idx] = data[idx + 1] = data[idx + 2] = gray > threshold ? 255 : 0;
        });
    }

    calculateOtsuThreshold(image) {
        // Otsu算法计算最佳阈值（实现代码参考前文）
        const { data } = image.bitmap;
        const histogram = new Array(256).fill(0);

        // 计算直方图（直接遍历数据）
        for (let i = 0; i < data.length; i += 4) {
            histogram[data[i]]++;
        }

        // 计算最佳阈值（原算法保持不变）
        let total = data.length / 4;
        let sum = histogram.reduce((s, v, i) => s + i * v, 0);

        let sumB = 0,
            wB = 0,
            maxVariance = 0,
            threshold = 0;

        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;
            const wF = total - wB;
            if (wF === 0) break;

            sumB += t * histogram[t];
            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;
            const variance = wB * wF * (mB - mF) ** 2;

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }

        // 返回计算得到的阈值
        return threshold;
    }

    removeLines(img) {
        const { width, height, data } = img.bitmap;
        const temp = Buffer.from(data);

        // 多方向线条检测
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (this.isLinePixel(temp, x, y, width, height)) {
                    this.eraseLine(img, x, y, width, height);
                }
            }
        }
    }

    isLinePixel(data, x, y, w, h) {
        // 检查垂直连续性
        let vertical = 1;
        for (let dy = 1; y + dy < h; dy++) {
            if (data[((y + dy) * w + x) * 4] < 128) vertical++;
            else break;
        }
        for (let dy = -1; y + dy >= 0; dy--) {
            if (data[((y + dy) * w + x) * 4] < 128) vertical++;
            else break;
        }

        // 检查水平连续性
        let horizontal = 1;
        for (let dx = 1; x + dx < w; dx++) {
            if (data[(y * w + (x + dx)) * 4] < 128) horizontal++;
            else break;
        }
        for (let dx = -1; x + dx >= 0; dx--) {
            if (data[(y * w + (x + dx)) * 4] < 128) horizontal++;
            else break;
        }

        // 判断是否为线条
        return (
            (vertical > this.config.lineThreshold || horizontal > this.config.lineThreshold) &&
            Math.abs(vertical - horizontal) > 2
        );
    }

    eraseLine(img, x, y, w, h) {
        // 横向擦除
        for (let dx = -2; dx <= 2; dx++) {
            if (x + dx >= 0 && x + dx < w) {
                const idx = (y * w + x + dx) * 4;
                img.bitmap.data[idx] = 255;
                img.bitmap.data[idx + 1] = 255;
                img.bitmap.data[idx + 2] = 255;
            }
        }
    }

    removeNoise(img) {
        const { width, height, data } = img.bitmap;
        const visited = new Uint8Array(width * height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (!visited[y * width + x]) {
                    const area = this.floodFill(img, x, y, visited);

                    console.log(area);

                    if (area.pixels > 0 && area.pixels <= this.config.noiseThreshold) {
                        this.eraseArea(img, area);
                    }
                }
            }
        }
    }

    floodFill(image, startX, startY, visited) {
        // 连通域分析（实现代码参考前文）
        // 返回连通区域面积
        const { width, height, data } = image.bitmap;
        const stack = [[startX, startY]];
        const area = { pixels: 0, points: [] };
        const targetColor = [
            data[(startY * width + startX) * 4],
            data[(startY * width + startX) * 4 + 1],
            data[(startY * width + startX) * 4 + 2],
        ];

        if (this.standardDeviation([255, 255, 255], targetColor) < 10) {
            // 白色连通域
            return area;
        }

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const idx = y * width + x;

            if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;

            visited[idx] = true;

            const currentColor = [
                data[(y * width + x) * 4],
                data[(y * width + x) * 4 + 1],
                data[(y * width + x) * 4 + 2],
            ];

            if (this.standardDeviation(currentColor, targetColor) < 20) {
                area.pixels++;
                area.points.push([x, y]);

                [
                    [x + 1, y], // 右
                    [x - 1, y], // 左
                    [x, y + 1], // 下
                    [x, y - 1], // 上
                    [x - 1, y - 1], // 左上
                    [x + 1, y - 1], // 右上
                    [x - 1, y + 1], // 左下
                    [x + 1, y + 1], // 左下
                ].forEach((p) => stack.push(p));
            }
        }
        return area;
    }

    async debugSave(img, name) {
        await img.write(name);
    }

    eraseArea(img, {points}) {
        const { width, height, data } = img.bitmap;

        points.forEach(([x, y]) => {
            const idx = (y * width + x) * 4;

            data[idx] = 255;
            data[idx + 1] = data[idx + 2] = 255;
        });
    }

    standardDeviation(color1, color2) {
        const [r1, g1, b1] = color1;
        const [r2, g2, b2] = color2;

        const diff = Math.sqrt((Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)) / 3);

        return diff;
    }
}

// 使用示例
(async () => {
    const cleaner = new CaptchaCleaner();
    const result = await cleaner.process('test1.png');
    await result.write('cleaned.png');
})();
