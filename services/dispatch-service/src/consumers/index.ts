import { startCourierAssignedConsumer, stopCourierAssignedConsumer } from './courier-assigned.consumer.js';

export async function startConsumers(): Promise<void> {
  await startCourierAssignedConsumer();
}

export async function stopConsumers(): Promise<void> {
  await stopCourierAssignedConsumer();
}
