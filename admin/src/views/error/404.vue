<template>
  <div class="error-page">
    <div class="error-code">404</div>
    <div class="error-desc">抱歉，您访问的页面不存在</div>
    <div class="error-action">
      <el-button type="primary" @click="goHome">返回首页</el-button>
      <el-button @click="goBack">返回上一页</el-button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}

const goBack = () => {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.error-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  
  .error-code {
    font-size: 120px;
    color: #409EFF;
    font-weight: bold;
    text-shadow: 2px 2px 10px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
  }
  
  .error-desc {
    font-size: 20px;
    color: #666;
    margin-bottom: 30px;
  }
  
  .error-action {
    display: flex;
    gap: 10px;
  }
}
</style> 