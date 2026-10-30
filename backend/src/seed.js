import mongoose from "mongoose";
import { config } from "./config.js";
import { Vehicle, VehicleAction } from "./models.js";

const CAT = {
  Toyota: ["Camry", "Corolla", "RAV4", "Highlander"],
  Honda: ["Civic", "Accord", "CR-V"],
  Ford: ["F-150", "Escape", "Mustang"],
  Hyundai: ["Elantra", "Tucson", "Santa Fe"],
  Kia: ["Sportage", "Sorento"],
  Mazda: ["Mazda3", "CX-5"],
  Subaru: ["Outback", "Forester"],
  VinFast: ["VF 6", "VF 8"],
};
const BASE = {
  Toyota: 26000,
  Honda: 25000,
  Ford: 31000,
  Hyundai: 23000,
  Kia: 24000,
  Mazda: 24500,
  Subaru: 27000,
  VinFast: 30000,
};
const DAY = 864e5;
const VIN_CHARS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

// Deterministic generator so every run produces the same demo data.
const rng = (a) => () => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const R = rng(2026);
const makes = Object.keys(CAT);
const now = new Date();
const start = Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
);

const docs = Array.from({ length: 240 }, () => {
  const make = makes[Math.floor(R() * makes.length)];
  const age = Math.floor(Math.pow(R(), 1.5) * 220);
  const vin = Array.from(
    { length: 17 },
    () => VIN_CHARS[Math.floor(R() * VIN_CHARS.length)],
  ).join("");
  return {
    dealership_id: "dealership-1",
    vin,
    make,
    model: CAT[make][Math.floor(R() * CAT[make].length)],
    year: 2023 + Math.floor(R() * 4),
    price: Math.round((BASE[make] + R() * 12000) / 100) * 100,
    status: "in_stock",
    date_received: new Date(start - age * DAY),
  };
});

await mongoose.connect(config.mongoUri);
await Promise.all([Vehicle.deleteMany({}), VehicleAction.deleteMany({})]);
await Vehicle.syncIndexes();
await Vehicle.insertMany(docs);
console.log(`Seeded ${docs.length} vehicles`);
await mongoose.disconnect();
