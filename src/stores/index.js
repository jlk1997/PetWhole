import { createPinia } from 'pinia'

/**
 * Stores统一导出
 */
import { useUserStore } from './user'
import { usePetStore } from './pet'
import { useLocationStore } from './location'

/**
 * 创建并导出pinia实例，避免潜在的循环依赖问题
 */
const pinia = createPinia()

// Re-export stores
export {
  useUserStore,
  usePetStore,
  useLocationStore
}

export default pinia 