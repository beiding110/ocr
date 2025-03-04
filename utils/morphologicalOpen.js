/** 形态学开运算（先腐蚀后膨胀）
    先腐蚀消除细小噪点（消除B字母孔洞中的噪点）
    再膨胀恢复字符主体形状
    使用3×3结构元素：
*/

const morphKernelSize = 1; // 形态学操作 1-3 较大值增强降噪但可能损失细节

module.exports = function morphologicalOpen(image) {
    const kernel = createMorphKernel();

    erode(image, kernel);
    dilate(image, kernel);
};

// 创建形态学操作核
function createMorphKernel() {
    return Array(morphKernelSize)
        .fill()
        .map(() => Array(morphKernelSize).fill(1));
}

// 腐蚀操作
function erode(image, kernel) {
    applyMorphOperation(image, kernel, Math.min);
}

// 膨胀操作
function dilate(image, kernel) {
    applyMorphOperation(image, kernel, Math.max);
}

// 形态学通用操作
function applyMorphOperation(image, kernel, operation) {
    const { width, height, data } = image.bitmap;
    const temp = Buffer.from(data);
    const kSize = kernel.length;
    const offset = Math.floor(kSize / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let values = [];

            for (let ky = 0; ky < kSize; ky++) {
                for (let kx = 0; kx < kSize; kx++) {
                    const px = x + kx - offset;
                    const py = y + ky - offset;
                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const idx = (py * width + px) * 4;
                        values.push(temp[idx]);
                    }
                }
            }

            const result = operation(...values);
            const idx = (y * width + x) * 4;

            image.bitmap.data[idx] = result;
            image.bitmap.data[idx + 1] = result;
            image.bitmap.data[idx + 2] = result;
        }
    }
}
