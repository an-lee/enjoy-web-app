# Enjoy Echo - Developer Documentation

## Overview

Enjoy Echo is a language learning product focused on speaking practice ("Shadowing"). It allows users to turn any audio/visual content into a pronunciation coach. The system uses AI to provide pronunciation assessment and personalized feedback.

This documentation guides the development of the **Web App** and its integration with the existing Browser Extension and Backend services.

## Documentation Index

1. [System Architecture](./architecture.md)
   - High-level architecture, technology stack, and project structure.
2. [Data Models](./data-models.md)
   - Database schema (PostgreSQL) and local storage (IndexedDB) design.
3. [API Services](./api-services.md)
   - Backend API endpoints for authentication, fast translation, and basic dictionary lookup.
4. [AI Service Architecture](./ai-services.md)
   - AI service design patterns, provider abstraction (Enjoy/Local/BYOK), and unified service interface.
5. [Frontend Development](./frontend.md)
   - UI/UX implementation, component hierarchy, state management, and routing.
6. [Business Logic & Workflows](./business-logic.md)
   - Core algorithms, practice loops, data synchronization, and local ASR strategy.

## Core Development Principles

- **LLM-Oriented**: Code should be modular and clearly typed to assist AI in generating correct logic.
- **Offline-First**: The Web App must support full offline functionality for local files, syncing when online.
- **Performance**: Audio/Video processing should not block the main thread (use Web Workers).
- **Type Safety**: Strict TypeScript usage across the entire stack.
