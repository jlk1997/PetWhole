import { createPinia } from 'pinia'

/**
 * 创建并导出pinia实例，避免潜在的循环依赖问题
 */
const pinia = createPinia()

export default pinia 