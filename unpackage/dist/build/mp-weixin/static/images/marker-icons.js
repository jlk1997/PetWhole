// 标记类型图标 - SVG格式
export const markerIcons = {
  // 普通标记 - 红色定位图标
  general: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FF5733">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`,
  
  // 宠物友好 - 绿色爪印图标
  pet_friendly: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#34A853">
    <path d="M4.5 12.65C5.35 12.45 6 11.7 6 10.8c0-1.1-0.9-2-2-2s-2 0.9-2 2c0 0.9 0.65 1.65 1.5 1.85v1.5c-2.5 0.5-4.5 3-4.5 6h2c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5h2c0-3-2-5.5-4.5-6v-1.5zm17-1.85v1.5c-2.5 0.5-4.5 3-4.5 6h2c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5h2c0-3-2-5.5-4.5-6v-1.5c0.85-0.2 1.5-0.95 1.5-1.85 0-1.1-0.9-2-2-2s-2 0.9-2 2c0 0.9 0.65 1.65 1.5 1.85zM12 4c-1.1 0-2 0.9-2 2s0.9 2 2 2 2-0.9 2-2-0.9-2-2-2zm0 16c1.1 0 2-0.9 2-2s-0.9-2-2-2-2 0.9-2 2 0.9 2 2 2z"/>
  </svg>`,
  
  // 危险区域 - 红色警告图标
  danger: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#EA4335">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>`,
  
  // 风景优美 - 蓝色风景图标
  scenic: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#4285F4">
    <path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.38 13.33 2.39 13 2.39 13S2 13.37 2 14.07v5.93c0 1 2 2 2 2h16c1 0 2-1 2-2v-5.93c0-0.7-0.39-1.07-0.39-1.07s-7.01 0.33-9.16 3l-1.6-1.2 3.38-4.5L18 8 14 6z"/>
  </svg>`,
  
  // 宠物服务 - 橙色宠物服务图标
  pet_service: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FF7F50">
    <path d="M19 7h-4V3H9v4H5l7 7 7-7zm-8 12v-4h2v4h-2zm4 0v-4h2v4h-2zm-8 0v-4h2v4H7z"/>
  </svg>`,
  
  // 自定义 - 紫色自定义图标
  custom: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#9370DB">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
    <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z"/>
  </svg>`
};

// 将SVG转换为Base64格式，用于图片URL
export const markerIconsBase64 = {};

Object.keys(markerIcons).forEach(type => {
  markerIconsBase64[type] = 'data:image/svg+xml;base64,' + btoa(markerIcons[type]);
});

// 标记类型的颜色
export const markerColors = {
  general: '#FF5733',
  pet_friendly: '#34A853',
  danger: '#EA4335',
  scenic: '#4285F4',
  pet_service: '#FF7F50',
  custom: '#9370DB'
}; 