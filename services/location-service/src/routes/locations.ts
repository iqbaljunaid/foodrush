import type { FastifyInstance } from "fastify";
import {
  updateLocation,
  findNearby,
  getLocation,
  removeLocation,
} from "../geo/redis-geo.js";
import {
  checkGeofences,
  registerGeofence,
  removeGeofence,
  listGeofences,
} from "../geo/geofence.js";
import type { LocationUpdate, GeofenceZone } from "../types/index.js";

export async function locationRoutes(app: FastifyInstance): Promise<void> {
  // Update entity location
  app.put<{ Body: LocationUpdate }>("/locations", async (request, reply) => {
    const { entityId, entityType, latitude, longitude, timestamp } =
      request.body;

    if (!entityId || !entityType || latitude == null || longitude == null) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    await updateLocation({
      entityId,
      entityType,
      latitude,
      longitude,
      timestamp: timestamp ?? new Date().toISOString(),
    });

    // Check geofences if entity is a courier
    let geofenceEvents: Awaited<ReturnType<typeof checkGeofences>> = [];
    if (entityType === "courier") {
      geofenceEvents = await checkGeofences(entityId, { latitude, longitude });
    }

    return reply.send({
      status: "updated",
      geofenceEvents: geofenceEvents.length > 0 ? geofenceEvents : undefined,
    });
  });

  // Get entity location
  app.get<{ Params: { entityId: string } }>(
    "/locations/:entityId",
    async (request, reply) => {
      const location = await getLocation(request.params.entityId);

      if (!location) {
        return reply.status(404).send({ error: "Location not found" });
      }

      return reply.send(location);
    },
  );

  // Find nearby entities
  app.get<{
    Querystring: {
      entityType: string;
      latitude: string;
      longitude: string;
      radiusKm?: string;
      limit?: string;
    };
  }>("/locations/nearby", async (request, reply) => {
    const {
      entityType,
      latitude,
      longitude,
      radiusKm = "5",
      limit = "10",
    } = request.query;

    if (!entityType || !latitude || !longitude) {
      return reply
        .status(400)
        .send({ error: "entityType, latitude, and longitude are required" });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return reply.status(400).send({ error: "Invalid coordinates" });
    }

    const results = await findNearby(
      entityType,
      lng,
      lat,
      parseFloat(radiusKm),
      parseInt(limit, 10),
    );

    return reply.send({ results });
  });

  // Delete entity location
  app.delete<{
    Params: { entityId: string };
    Querystring: { entityType: string };
  }>("/locations/:entityId", async (request, reply) => {
    const { entityType } = request.query;

    if (!entityType) {
      return reply
        .status(400)
        .send({ error: "entityType query parameter is required" });
    }

    await removeLocation(entityType, request.params.entityId);
    return reply.status(204).send();
  });

  // Register geofence zone
  app.post<{ Body: GeofenceZone }>("/geofences", async (request, reply) => {
    const { id, name, center, radiusMeters, type, entityId } = request.body;

    if (!id || !name || !center || !radiusMeters || !type || !entityId) {
      return reply.status(400).send({ error: "Missing required fields" });
    }

    await registerGeofence({ id, name, center, radiusMeters, type, entityId });
    return reply.status(201).send({ status: "created", id });
  });

  // List geofences
  app.get("/geofences", async (_request, reply) => {
    const zones = await listGeofences();
    return reply.send({ zones });
  });

  // Delete geofence
  app.delete<{ Params: { id: string } }>(
    "/geofences/:id",
    async (request, reply) => {
      await removeGeofence(request.params.id);
      return reply.status(204).send();
    },
  );
}
