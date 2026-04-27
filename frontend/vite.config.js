import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Mediapipe가 Vite의 의존성 분석 시스템을 통과하지 못하게 아예 제외시킵니다.
    exclude: ['@mediapipe/pose', '@mediapipe/camera_utils'],
  },
  // 브라우저에서 'module'을 찾지 못할 때를 대비한 별칭 설정
  resolve: {
    alias: {
      '@mediapipe/pose': '@mediapipe/pose/pose.js',
      '@mediapipe/camera_utils': '@mediapipe/camera_utils/camera_utils.js',
    },
  },
});