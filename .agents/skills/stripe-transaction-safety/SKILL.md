---
name: stripe-transaction-safety
description: Use this skill when managing Stripe checkout, processing payments, executing refunds, or writing payment webhooks.
---

# Stripe Transaction Safety Protocol

Ensure booking transactions and Stripe payments are synchronized atomically, avoiding race conditions, double-bookings, or lost slot reservations.

## 1. Idempotency & Webhooks
- Always verify incoming webhook signatures with Stripe using the webhook secret.
- Implement idempotency checks by logging event IDs to prevent processing duplicate webhook events.
- Never use raw credit card numbers or process cards directly; always route through Stripe Elements or Stripe Checkout.

## 2. Atomic Slot Reservations
- Game slots must be held temporarily during checkout, and only confirmed in the database once Stripe emits the `checkout.session.completed` event.
- Ensure that slot incrementing/decrementing and payment verification are executed as an atomic database transaction.

## 3. Graceful Refund Execution
- Ensure refunds are tracked with the corresponding booking ID and game slot incrementing is updated atomically upon refund confirmation.
