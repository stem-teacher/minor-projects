# Projects Repository Development Guide

## Build Commands
- `npm run dev` - Run development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run tauri:dev` - Run Tauri app in development mode (EmergentMind)
- `npm run tauri:build` - Build Tauri app for production (EmergentMind)

## Test Commands
- `npm test` - Run all tests
- `npm run test:unit:only` - Run single unit test with "only" flag (Marked)
- `vitest <testNamePattern>` - Run filtered tests by name (UI projects)

## Code Style Guidelines
- **TypeScript**: Use strict type checking with explicit return types
- **Formatting**: 2-space indentation, ES module syntax
- **Components**: Functional React components with TypeScript interfaces
- **Imports**: Group by source (built-in, external, internal)
- **Naming**: PascalCase for components, camelCase for variables
- **CSS**: Use Tailwind utility classes and shadcn/ui components
- **Error Handling**: Use try/catch with appropriate error messages

## Project Structure
- EmergentMind: Tauri (Rust) + React frontend
- Research UI: Component libraries with shadcn/ui
- Textbooks/PDF Tools: Python-based utilities