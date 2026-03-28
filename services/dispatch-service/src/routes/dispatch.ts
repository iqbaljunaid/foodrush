import type { FastifyInstance } from 'fastify';
import { matchCourierToOrder, findNearbyCouriers } from '../matching/courier-matcher.js';
import { publishDispatchEvent } from '../events/producer.js';
import { TOPICS, buildCourierAssignedEvent } from '../events/schemas.js';
import type { CourierAssignmentRequest } from '../types/index.js';

export async function dispatchRoutes(app: FastifyInstance): Promise<void> {
  // Assign courier to order
  app.post<{ Body: CourierAssignmentRequest }>('/dispatch/assign', async (request, reply) => {
    const { orderId, restaurantId, pickupLocation, deliveryLocation, maxRadiusKm } = request.body;

    if (!orderId || !restaurantId || !pickupLocation || !deliveryLocation) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }

    const assignment = await matchCourierToOrder({
      orderId,
      restaurantId,
      pickupLocation,
      deliveryLocation,
      maxRadiusKm: maxRadiusKm ?? 5,
    });

    if (!assignment) {
      return reply.status(404).send({ error: 'No available couriers found nearby' });
    }

    await publishDispatchEvent(
      TOPICS.COURIER_ASSIGNED,
      buildCourierAssignedEvent(assignment),
    );

    return reply.status(200).send(assignment);
  });

  // Find nearby couriers
  app.get<{
    Querystring: { latitude: string; longitude: string; radiusKm?: string; limit?: string };
  }>('/dispatch/nearby', async (request, reply) => {
    const { latitude, longitude, radiusKm = '5', limit = '10' } = request.query;

    if (!latitude || !longitude) {
      return reply.status(400).send({ error: 'latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return reply.status(400).send({ error: 'Invalid coordinates' });
    }

    const couriers = await findNearbyCouriers(
      { latitude: lat, longitude: lng },
      parseFloat(radiusKm),
      parseInt(limit, 10),
    );

    return reply.send({ couriers });
  });
}
