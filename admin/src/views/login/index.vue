<template>
  <div class="login-container">
    <div class="login-card">
      <div class="title">
        <h2>DogRun管理系统</h2>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="User"
          >
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            show-password
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button
            :loading="loading"
            type="primary"
            class="login-button"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { post } from '@/api'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

// 登录表单数据
const loginForm = reactive({
  username: 'admin',
  password: '123456'
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = () => {
  loginFormRef.value.validate(async (valid) => {
    if (!valid) {
      return false
    }
    
    loading.value = true
    
    try {
      // 调用后端登录接口
      const response = await post('/admin/login', loginForm)
      
      // 登录成功，保存token和用户信息
      localStorage.setItem('token', response.token)
      localStorage.setItem('user', JSON.stringify(response.data))
      
      // 跳转到主页
      router.push('/')
      
      ElMessage({
        type: 'success',
        message: '登录成功'
      })
    } catch (error) {
      console.error('登录失败:', error)
      ElMessage.error(error.response?.data?.message || '登录失败，请检查用户名和密码')
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  background-color: #2d3a4b;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  .login-card {
    width: 400px;
    padding: 40px;
    background-color: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
    
    .title {
      text-align: center;
      margin-bottom: 30px;
      
      h2 {
        font-size: 24px;
        color: #409EFF;
      }
    }
    
    .login-form {
      .login-button {
        width: 100%;
      }
    }
  }
}
</style> 