import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Vehicle, VehicleAction, ACTION_STATUSES } from './models.js';
import { config } from './config.js';
import { ageOf, daysAgo } from './age.js';

export const router = Router();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const parse = (schema, data) => {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return r.data;
};
const escapeRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listSchema = z.object({
  make: z.string().max(40).optional(),
  model: z.string().max(40).optional(),
  q: z.string().max(60).optional(),
  bucket: z.enum(['all', '0-30', '31-90', 'aging']).default('all'),
  sort: z.enum(['age_desc', 'age_asc', 'price_desc', 'price_asc']).default('age_desc'),
  page: z.coerce.number().int().min(1).default(1),
  size: z.coerce.number().int().min(1).max(100).default(12),
});

const SORTS = {
  age_desc: { date_received: 1, _id: 1 }, // oldest first
  age_asc: { date_received: -1, _id: 1 },
  price_desc: { price: -1, _id: 1 },
  price_asc: { price: 1, _id: 1 },
};

const baseFilter = (dealershipId) => ({ dealership_id: dealershipId, status: 'in_stock' });

function buildFilter(dealershipId, p) {
  const f = baseFilter(dealershipId);
  if (p.make) f.make = p.make;
  if (p.model) f.model = p.model;
  if (p.q) {
    // Regex search is fine at dealership scale; move to a text or Atlas Search index if it grows.
    const rx = new RegExp(escapeRx(p.q), 'i');
    f.$or = [{ vin: rx }, { make: rx }, { model: rx }];
  }
  const aging = daysAgo(config.agingDays);
  if (p.bucket === 'aging') f.date_received = { $lt: aging };
  if (p.bucket === '0-30') f.date_received = { $gte: daysAgo(30) };
  if (p.bucket === '31-90') f.date_received = { $lt: daysAgo(30), $gte: aging };
  return f;
}

// One query for the latest action of every vehicle on the page (no N+1).
async function currentActions(ids) {
  if (!ids.length) return new Map();
  const rows = await VehicleAction.aggregate([
    { $match: { vehicle_id: { $in: ids } } },
    { $sort: { created_at: -1 } },
    { $group: { _id: '$vehicle_id', doc: { $first: '$$ROOT' } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.doc]));
}

const dto = (v, cur) => {
  const age = ageOf(v.date_received);
  return {
    id: String(v._id),
    vin: v.vin,
    make: v.make,
    model: v.model,
    year: v.year,
    price: v.price,
    date_received: v.date_received,
    age_days: age,
    is_aging: age > config.agingDays,
    current_action: cur ? { status: cur.action_status, notes: cur.notes, created_at: cur.created_at } : null,
  };
};

async function withActions(vehicles) {
  const map = await currentActions(vehicles.map((v) => v._id));
  return vehicles.map((v) => dto(v, map.get(String(v._id))));
}

router.get(
  '/vehicles',
  wrap(async (req, res) => {
    const p = parse(listSchema, req.query);
    const filter = buildFilter(req.dealershipId, p);
    const [total, docs] = await Promise.all([
      Vehicle.countDocuments(filter),
      Vehicle.find(filter).sort(SORTS[p.sort]).skip((p.page - 1) * p.size).limit(p.size).lean(),
    ]);
    res.json({ items: await withActions(docs), total, page: p.page, pages: Math.max(1, Math.ceil(total / p.size)), size: p.size });
  })
);

router.get(
  '/vehicles/summary',
  wrap(async (req, res) => {
    const base = baseFilter(req.dealershipId);
    const agingFilter = { ...base, date_received: { $lt: daysAgo(config.agingDays) } };
    const [total, agingIds, avg] = await Promise.all([
      Vehicle.countDocuments(base),
      Vehicle.distinct('_id', agingFilter),
      Vehicle.aggregate([{ $match: base }, { $group: { _id: null, d: { $avg: '$date_received' } } }]),
    ]);
    const actioned = agingIds.length ? (await VehicleAction.distinct('vehicle_id', { vehicle_id: { $in: agingIds } })).length : 0;
    res.json({ total, aging: agingIds.length, unactioned: agingIds.length - actioned, avg_age_days: avg[0] ? ageOf(avg[0].d) : 0 });
  })
);

router.get(
  '/vehicles/aging',
  wrap(async (req, res) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(100).default(6) }), req.query);
    const filter = { ...baseFilter(req.dealershipId), date_received: { $lt: daysAgo(config.agingDays) } };
    const docs = await Vehicle.find(filter).sort(SORTS.age_desc).limit(limit).lean();
    res.json(await withActions(docs));
  })
);

router.get(
  '/vehicles/facets',
  wrap(async (req, res) => {
    const rows = await Vehicle.aggregate([{ $match: baseFilter(req.dealershipId) }, { $group: { _id: { make: '$make', model: '$model' } } }]);
    const models = {};
    rows.forEach((r) => (models[r._id.make] ??= []).push(r._id.model));
    Object.values(models).forEach((a) => a.sort());
    res.json({ makes: Object.keys(models).sort(), models });
  })
);

router.get(
  '/vehicles/:id/actions',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid vehicle id');
    const rows = await VehicleAction.find({ vehicle_id: req.params.id, dealership_id: req.dealershipId }).sort({ created_at: -1 }).limit(50).lean();
    res.json(rows.map((a) => ({ id: String(a._id), action_status: a.action_status, notes: a.notes, created_at: a.created_at })));
  })
);

router.post(
  '/vehicles/:id/actions',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'Invalid vehicle id');
    const body = parse(z.object({ action_status: z.enum(ACTION_STATUSES), notes: z.string().trim().max(300).default('') }), req.body);
    const v = await Vehicle.findOne({ _id: req.params.id, dealership_id: req.dealershipId }).lean();
    if (!v) throw new HttpError(404, 'Vehicle not found');
    if (ageOf(v.date_received) <= config.agingDays) throw new HttpError(422, 'Actions can only be logged on aging stock');
    const doc = await VehicleAction.create({
      ...body,
      vehicle_id: v._id,
      dealership_id: req.dealershipId,
      created_by: req.header('x-user-id') || 'manager',
    });
    req.log.info({ vehicle_id: String(v._id), action: body.action_status }, 'action logged');
    res.status(201).json({ id: String(doc._id), action_status: doc.action_status, notes: doc.notes, created_at: doc.created_at });
  })
);
