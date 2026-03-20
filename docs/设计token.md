# HKSchoolPlace 设计 Token

本文档将设计标准转化为可直接使用的 Tailwind CSS 配置和开发规范。

---

## 1. Tailwind 扩展配置

以下配置应写入 `tailwind.config.ts` 的 `theme.extend` 中：

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 主色 - 教育绿
        primary: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#22C55E',   // 主色
          600: '#16A34A',   // 强调
          700: '#166534',
          800: '#14532D',
          900: '#052E16',
        },
        // vacancy 状态色
        vacancy: {
          available: {
            bg: '#ECFDF5',
            text: '#16A34A',
          },
          waiting: {
            bg: '#FFFBEB',
            text: '#D97706',
          },
          full: {
            bg: '#F3F4F6',
            text: '#6B7280',
          },
          unknown: {
            bg: '#F9FAFB',
            text: '#9CA3AF',
          },
        },
        // 页面背景
        surface: {
          primary: '#F8FAFC',
          secondary: '#F1F5F9',
        },
      },
      fontFamily: {
        sans: [
          'PingFang SC',
          'Noto Sans TC',
          'SF Pro Display',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        // 自定义字号体系
        'title': ['18px', { lineHeight: '28px', fontWeight: '500' }],
        'title-lg': ['20px', { lineHeight: '30px', fontWeight: '500' }],
        'vacancy-number': ['32px', { lineHeight: '40px', fontWeight: '700' }],
        'vacancy-number-lg': ['40px', { lineHeight: '48px', fontWeight: '700' }],
        'body': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'meta': ['12px', { lineHeight: '18px', fontWeight: '400' }],
      },
      borderRadius: {
        'card': '16px',
        'chip': '999px',
        'button': '12px',
      },
      boxShadow: {
        'card': '0 8px 30px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.1)',
        'chip': '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      spacing: {
        'card-gap': '20px',
        'card-padding': '16px',
        'section-gap': '24px',
      },
      backdropBlur: {
        'card': '20px',
      },
      transitionDuration: {
        'card': '200ms',
      },
      screens: {
        // 响应式断点
        'xs': '375px',    // 小屏手机
        'sm': '640px',    // 大屏手机/小平板
        'md': '768px',    // 平板
        'lg': '1024px',   // 桌面
        'xl': '1280px',   // 大桌面
      },
    },
  },
  plugins: [],
}

export default config
```

---

## 2. 核心组件样式规范

### 2.1 卡片 (Card)

```css
/* 标准卡片 */
.card {
  @apply bg-white/70 backdrop-blur-card rounded-card shadow-card;
  @apply p-card-padding;
  @apply transition-all duration-card;
}

/* 卡片 hover */
.card:hover {
  @apply shadow-card-hover scale-[1.02];
}
```

关键规则：
- 使用半透明白色 + 模糊效果，不使用实心色块
- 不使用边框，用阴影区分层级
- hover 有轻微放大效果

### 2.2 Vacancy 状态标签

```html
<!-- available -->
<span class="inline-flex items-center px-3 py-1 rounded-chip text-sm font-medium bg-vacancy-available-bg text-vacancy-available-text">
  8個空位
</span>

<!-- waiting -->
<span class="inline-flex items-center px-3 py-1 rounded-chip text-sm font-medium bg-vacancy-waiting-bg text-vacancy-waiting-text">
  候補中
</span>

<!-- full -->
<span class="inline-flex items-center px-3 py-1 rounded-chip text-sm font-medium bg-vacancy-full-bg text-vacancy-full-text">
  已滿額
</span>

<!-- unknown -->
<span class="inline-flex items-center px-3 py-1 rounded-chip text-sm font-medium bg-vacancy-unknown-bg text-vacancy-unknown-text">
  未知
</span>
```

### 2.3 筛选 Chip

```css
/* 默认状态 */
.filter-chip {
  @apply bg-surface-secondary rounded-chip px-3 py-1.5;
  @apply text-sm text-gray-700;
  @apply transition-colors duration-150;
}

/* 选中状态 */
.filter-chip-active {
  @apply bg-primary-50 text-primary-700;
}
```

行为：横向滚动，不换行

### 2.4 按钮

```css
/* 主按钮 */
.btn-primary {
  @apply bg-primary-500 text-white rounded-button px-6 py-3;
  @apply text-sm font-medium;
  @apply hover:bg-primary-600 active:bg-primary-700;
  @apply transition-colors duration-150;
}

/* 次要按钮 */
.btn-secondary {
  @apply bg-surface-secondary text-gray-700 rounded-button px-4 py-2;
  @apply text-sm;
  @apply hover:bg-gray-200;
  @apply transition-colors duration-150;
}

/* 图标按钮（收藏/对比） */
.btn-icon {
  @apply p-2 rounded-full;
  @apply text-gray-400 hover:text-primary-500;
  @apply transition-colors duration-150;
}
```

---

## 3. 页面背景

```css
body {
  @apply bg-gradient-to-b from-surface-primary to-surface-secondary;
  @apply min-h-screen;
}
```

不使用纯白背景——使用轻微渐变，营造空气感。

---

## 4. 信息层级（所有页面必须遵守）

| 优先级 | 内容 | 样式特征 |
|--------|------|----------|
| 1️⃣ 最高 | vacancy 状态/数量 | 最大字号（32-40px），彩色标签 |
| 2️⃣ | 学校名称 | 中等字号（18-20px），黑色 |
| 3️⃣ | 地区 / 校网 | 小字号（13-14px），灰色 |
| 4️⃣ | 标签（类型等） | 小字号（12px），chip 样式 |
| 5️⃣ 最低 | 其他辅助信息 | 12px，浅灰色 |

**核心原则：一屏只允许一个大字体焦点 — 就是 vacancy。**

---

## 5. 响应式布局

### 5.1 断点策略

| 断点 | 宽度 | 布局 |
|------|------|------|
| `xs` | < 640px | 单列，卡片占满宽度 |
| `sm` | 640-767px | 单列，卡片有左右 padding |
| `md` | 768-1023px | 双列卡片网格 |
| `lg` | 1024-1279px | 三列卡片网格 |
| `xl` | ≥ 1280px | 三列，内容居中 max-width |

### 5.2 移动端优先设计

```css
/* 学校卡片列表 */
.school-grid {
  @apply grid grid-cols-1;
  @apply sm:grid-cols-1;
  @apply md:grid-cols-2;
  @apply lg:grid-cols-3;
  @apply gap-card-gap;
}

/* 内容容器 */
.container {
  @apply mx-auto px-4;
  @apply sm:px-6;
  @apply lg:px-8;
  @apply max-w-7xl;
}
```

### 5.3 移动端适配要点

- 筛选 chips 横向滚动（`overflow-x-auto`，隐藏滚动条）
- 对比表格横向滚动
- 卡片内 vacancy 数字在移动端使用 32px，桌面 40px
- 底部操作栏（收藏/对比按钮）在移动端固定底部
- 搜索框在移动端占满宽度

---

## 6. 动效规范

| 场景 | 效果 | 时长 |
|------|------|------|
| 卡片 hover | `scale(1.02)` + 阴影增强 | 200ms |
| 筛选切换 | `fade + translateY(4px)` | 100ms |
| 页面切换 | Next.js 内置平滑过渡 | — |
| Toast 提示 | 从底部滑入 | 200ms |
| 登录弹层 | 背景模糊 + 弹层从底部滑入 | 250ms |
| 骨架屏 | `animate-pulse` | 持续 |

**关键原则：动效要轻盈，不能让页面感觉沉重。**

---

## 7. 学段视觉差异化

不同学段卡片的 vacancy 信息有轻微差异：

| 学段 | 主要 vacancy 展示 | 特有标签 |
|------|-------------------|----------|
| 幼稚园 | 🟢 K1 有位 | 全日/半日、參加計劃 |
| 小学 | 🟢 小一空位 | 校網 XX |
| 中学 | 🎓 Band X | 直資/津貼 |

---

## 8. 间距速查

基础单位：`8px`

| 用途 | 值 | Tailwind |
|------|----|----|
| 卡片内边距 | 16px | `p-4` |
| 卡片间距 | 20px | `gap-5` |
| 区块间距 | 24px | `mb-6` |
| 页面两侧 padding | 16px (mobile) / 24px (tablet) / 32px (desktop) | `px-4 sm:px-6 lg:px-8` |
| 筛选 chip 间距 | 8px | `gap-2` |

---

## 9. 不做的事（避免过度设计）

- ❌ 不做深色模式（MVP 不需要）
- ❌ 不做复杂动画（如 Lottie、GSAP）
- ❌ 不做自定义滚动条
- ❌ 不做视差效果
- ❌ 不做渐变色按钮
