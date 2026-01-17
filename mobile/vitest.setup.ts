import { vi } from 'vitest';

// Mock expo-crypto
vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-12345'),
}));

// Mock expo-localization
vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageTag: 'en' }]),
}));
