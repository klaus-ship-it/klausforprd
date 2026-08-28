# Aggregator Platform - Frontend

A comprehensive Vue 3 + TypeScript frontend for the Aggregator Platform with support for Master Admin and Merchant portals.

## Technology Stack

- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build Tool**: Vite
- **UI Library**: Naive UI
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **Routing**: Vue Router
- **Internationalization**: Vue I18n

## Project Structure

```
src/
├── api/                  # API client and endpoints
├── components/
│   ├── Common/          # Shared UI components
│   ├── Master/          # Master portal components
│   └── Merchant/        # Merchant portal components
├── locales/             # i18n translations
├── mocks/               # MSW mock handlers
├── router/              # Vue Router configuration
├── stores/              # Pinia stores (auth, config, merchant)
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── views/
│   ├── Master/          # Master portal pages
│   ├── Merchant/        # Merchant portal pages
│   └── Login.vue        # Login page
├── App.vue              # Root component
├── main.ts              # App entry point
└── style.css            # Global styles
```

## Setup

### Prerequisites

- Node.js 16+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building

```bash
npm run build
```

## Key Features

### Authentication
- User login with role-based access (MASTER/MERCHANT)
- Token-based authentication with localStorage persistence
- Automatic session validation and renewal

### Role-Based Access Control
- Master Admin routes restricted to MASTER role
- Merchant routes restricted to MERCHANT role
- Permission checking for specific actions

### Internationalization
- Support for Traditional Chinese (zh-TW), Simplified Chinese (zh-CN), and English (en)
- All UI text externalized to i18n keys

### State Management
- **useAuthStore**: Authentication and user info
- **useConfigStore**: Global UI configuration (locale, theme)
- **useMerchantStore**: Merchant context (Master portal)

### API Integration
- Centralized API client with error handling
- Automatic token injection in headers
- Global error interceptor for 401/403 responses

### UI Components
- Naive UI components for consistent styling
- Tailwind CSS utility classes
- Responsive design patterns

## Development Guidelines

Please refer to the `CODE_STYLE_GUIDE.md` and `FRONTEND_TECH_SPEC.md` documents for detailed development standards.

### Key Rules

- No hardcoded strings - use i18n
- No `any` type - use proper TypeScript types
- API fields maintain snake_case (no conversion)
- Components follow PascalCase naming
- Local state preferred over global Pinia stores
- Mock API responses during development
