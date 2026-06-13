import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

// 注意：开发模式下禁用 React StrictMode，避免 useEffect 双调用导致
// InputManager 单例被 dispose 后再 attach 时残留事件监听器
createRoot(document.getElementById('root')!).render(
  <App />
)
