import { startOrderPlacedConsumer, stopOrderPlacedConsumer } from './order-placed.consumer.js';

export async function startConsumers(): Promise<void> {
  await startOrderPlacedConsumer();
}

export async function stopConsumers(): Promise<void> {
  await stopOrderPlacedConsumer();
}
