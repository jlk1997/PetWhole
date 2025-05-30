<template>
  <div class="app-wrapper">
    <router-view />
  </div>
</template>

<script setup>
// App组件逻辑
</script>

<style lang="scss">
.app-wrapper {
  height: 100%;
  width: 100%;
}
</style>

<style>
/* 全局样式 */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB',
    'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

#app {
  height: 100%;
}

/* 禁止浏览器缓存图片 */
img[src*="/static/"] {
  max-width: 100%;
  /* 禁用浏览器缓存 */
  -webkit-cache-control: no-cache, no-store, must-revalidate !important;
  -moz-cache-control: no-cache, no-store, must-revalidate !important;
  cache-control: no-cache, no-store, must-revalidate !important;
  -webkit-pragma: no-cache !important;
  -moz-pragma: no-cache !important;
  pragma: no-cache !important;
  -webkit-expires: 0 !important;
  -moz-expires: 0 !important;
  expires: 0 !important;
}
</style> 