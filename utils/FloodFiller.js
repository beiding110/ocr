module.exports = class FloodFiller {
    constructor(tolerance = 32) {
        this.tolerance = tolerance; // 颜色容差值（0-255）
        this.directions = [
            [1, 0],
            [-1, 0],
        ]; // 水平扫描方向
    }

    // 主填充方法
    fill(image, startX, startY, newColor) {
        const { width, height, data } = image.bitmap;

        this.imageData = data;

        const targetColor = this.getPixelColor(data, startX, startY, width);
        const queue = [];

        if (this.colorsMatch(targetColor, newColor)) return;

        this.scanLine(queue, startX, startY, width, height, targetColor);

        while (queue.length > 0) {
            const { x1, x2, y } = queue.pop();
            let spanAbove = false;
            let spanBelow = false;

            for (let x = x1; x <= x2; x++) {
                const idx = (y * width + x) << 2;
                if (!this.colorsMatch(data.slice(idx, idx + 3), targetColor)) continue;

                // 替换像素颜色
                data[idx] = newColor[0];
                data[idx + 1] = newColor[1];
                data[idx + 2] = newColor[2];

                // 扫描上方行
                if (y > 0) {
                    const aboveIdx = ((y - 1) * width + x) << 2;
                    if (!spanAbove && this.colorsMatch(data.slice(aboveIdx, aboveIdx + 3), targetColor)) {
                        this.scanLine(queue, x, y - 1, width, height, targetColor);
                        spanAbove = true;
                    } else if (spanAbove) {
                        spanAbove = false;
                    }
                }

                // 扫描下方行
                if (y < height - 1) {
                    const belowIdx = ((y + 1) * width + x) << 2;
                    if (!spanBelow && this.colorsMatch(data.slice(belowIdx, belowIdx + 3), targetColor)) {
                        this.scanLine(queue, x, y + 1, width, height, targetColor);
                        spanBelow = true;
                    } else if (spanBelow) {
                        spanBelow = false;
                    }
                }
            }
        }
    }

    // 扫描线核心算法
    scanLine(queue, x, y, width, height, targetColor) {
        let x1 = x;
        // 向左扩展
        while (x1 >= 0 && this.colorCheck(x1, y, width, targetColor)) x1--;
        x1++;

        let x2 = x;
        // 向右扩展
        while (x2 < width && this.colorCheck(x2, y, width, targetColor)) x2++;
        x2--;

        queue.push({ x1, x2, y });
    }

    // 带容差的颜色比较
    colorsMatch(colorA, colorB) {
        return (
            Math.abs(colorA[0] - colorB[0]) <= this.tolerance &&
            Math.abs(colorA[1] - colorB[1]) <= this.tolerance &&
            Math.abs(colorA[2] - colorB[2]) <= this.tolerance
        );
    }

    // 像素颜色获取
    getPixelColor(data, x, y, width) {
        const idx = (y * width + x) << 2;
        return [data[idx], data[idx + 1], data[idx + 2]];
    }

    // 带容差的像素检测
    colorCheck(x, y, width, targetColor) {
        const currentColor = this.getPixelColor(this.imageData, x, y, width);
        return this.colorsMatch(currentColor, targetColor);
    }
};
