console.log("配置检查脚本开始运行...");

// 确保控制台输出正常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

try {
  const fs = require('fs');
  console.log("成功加载fs模块");
  
  // 基本文件检查
  console.log("检查关键文件...");
  const requiredFiles = [
    'manifest.json',
    'pages.json',
    'vite.config.js',
    'main.js',
    'App.vue',
    'package.json'
  ];
  
  for (const file of requiredFiles) {
    try {
      const exists = fs.existsSync(file);
      console.log(`文件 ${file} ${exists ? '存在' : '不存在'}`);
    } catch (err) {
      console.error(`检查文件 ${file} 出错:`, err);
    }
  }
  
  console.log("检查完成");
} catch (err) {
  console.error("运行时错误:", err);
}

// 在文件末尾添加一个额外的控制台输出
console.log('脚本执行结束'); 