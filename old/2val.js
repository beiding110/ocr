const fs = require('fs');
const atob = require('atob');
const {  createCanvas,  loadImage} = require('canvas')
const canvas = createCanvas(92, 34);
const ctx = canvas.getContext('2d')
console.log(ctx)

​function ProcessToGrayImage(ctx) {  
    //取得图像数据  
    var imgData = ctx.getImageData(10, 10, 50, 50);  
    var canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);  
    //这个循环是取得图像的每一个点，在计算灰度后将灰度设置给原图像​  
    for (var x = 0; x < canvasData.width; x++) {    
    //alert("x="+x);    
    for (var y = 0; y < canvasData.height; y++) {      
    //alert("y="+y);      
    // Index of the pixel in the array      
    var idx = (x + y * canvas.width) * 4;​      
    // The RGB values      
    var r = canvasData.data[idx + 0];      
    var g = canvasData.data[idx + 1];      
    var b = canvasData.data[idx + 2];      
    //更新图像数据     
    var gray = CalculateGrayValue(r, g, b);      
    canvasData.data[idx + 0] = gray;      
    canvasData.data[idx + 1] = gray;      
    canvasData.data[idx + 2] = gray;    
    }  
    }  
    ctx.putImageData(canvasData, 0, 0);
    }
    //一维OTSU图像处理算法
    function OTSUAlgorithm(threshold) {​  
    var imageInfo = GetGrayImageInfo(ctx);  
    if (imageInfo == null) {    
    console.warn("图像还没有转化为灰度图像！");    
    return;  
    }  
    //获取图像信息  
    var canvasData = imageInfo[0];​    
    //下面执行二值化过程   
    for (i = 0; i < canvasData.width; i++) {    
    for (j = 0; j < canvasData.height; j++) {      
    //取得每一点的位置      
    var ids = (i + j * canvasData.width) * 4;      
    //取得像素的R分量的值      
    var r = canvasData.data[ids];      
    //与阀值进行比较，如果小于阀值，那么将改点置为0，否则置为255      
    var gray = r > threshold ? 255 : 0;      
    canvasData.data[ids + 0] = gray;      
    canvasData.data[ids + 1] = gray;      
    canvasData.data[ids + 2] = gray;    
    }  
    }  
    //显示二值化图像  
    // var newImage = document.getElementById('myCanvas').getContext('2d');  
    ctx.putImageData(canvasData, 0, 0);
    }
    ​//获取图像的灰度图像的信息
    function GetGrayImageInfo(ctx) {  
    // var canvas = document.getElementById('myCanvas');  
    // var ctx = canvas.getContext('2d');  
    var canvasData = ctx.getImageData(0, 0, canvas.width, canvas.height);  
    if (canvasData.data.length == 0) {    return null;  }  return [canvasData, ctx];}
    //计算图像的灰度值,公式为：Gray = R*0.299 + G*0.587 + B*0.114
    function CalculateGrayValue(rValue, gValue, bValue) {  
    return parseInt(rValue * 0.299 + gValue * 0.587 + bValue * 0.114);
    }
    function dataURLtoFile(dataurl, filename) {  
    var arr = dataurl.split(','), 
    mime = arr[0].match(/:(.*?);/)[1],      
    bstr = atob(arr[1]), 
    n = bstr.length, 
    u8arr = new Uint8Array(n);  
    while(n--){      
    u8arr[n] = bstr.charCodeAt(n);  
    }  
    return u8arr;
    }
    ​loadImage('./1.jpg').then(image => {  
    ctx.drawImage(image, 0, 0, 92, 34)  
    ProcessToGrayImage(ctx);  
    OTSUAlgorithm(120);  
    fs.writeFileSync('./2.jpg',dataURLtoFile(canvas.toDataURL()),{flag:'w'})  
    console.log('<img src="' + canvas.toDataURL() + '" />')
    })
