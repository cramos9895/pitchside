---
name: typescript-form-safety
description: Use this skill when writing React components, forms, handling state, or writing Next.js Server Actions with TypeScript.
---

# TypeScript Form & State Safety Protocol

To ensure clean execution and prevent TypeScript/state errors in React forms and Server Actions, adhere to the following rules:

## 1. Type-Safe Server Actions & Forms
- Always define explicit Type/Interface parameters for input and output state of Server Actions.
- Avoid using `any` type for parameters, form data, or return states. Use helper types or `FormData` explicitly.
- Example structure:
  ```typescript
  export interface ActionResponse {
    success: boolean;
    message: string;
    errors?: Record<string, string[]>;
  }
  ```

## 2. Server-Side State Hooks
- In client components, use React's modern state handling hooks such as `useActionState` (or similar Next.js App Router form state pattern) to manage submission states and return values.
- Handle standard state transitions: pending (`isPending`), success, and validation errors.

## 3. Client Validation
- Perform initial verification and validation in the browser before submitting forms, and handle backend validation errors gracefully by displaying them inline next to the respective inputs.
