import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const ACTION_STATUSES = [
  'Price Reduction Planned',
  'Transfer to Another Lot',
  'Wholesale/Auction',
  'Promotion Planned',
  'No Action Needed',
];

const vehicleSchema = new Schema({
  dealership_id: { type: String, required: true },
  vin: { type: String, required: true, unique: true },
  make: { type: String, required: true },
  model: { type: String, required: true },
  year: Number,
  price: Number,
  status: { type: String, enum: ['in_stock', 'sold', 'on_hold'], default: 'in_stock' },
  date_received: { type: Date, required: true },
});
// Serves the aging query and the age sort for one dealership.
vehicleSchema.index({ dealership_id: 1, status: 1, date_received: 1 });
// Serves the make / model filters.
vehicleSchema.index({ dealership_id: 1, make: 1, model: 1 });

// Append-only log: the newest document per vehicle is its current action.
const actionSchema = new Schema(
  {
    vehicle_id: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    dealership_id: { type: String, required: true },
    action_status: { type: String, enum: ACTION_STATUSES, required: true },
    notes: { type: String, maxlength: 300, default: '' },
    created_by: { type: String, default: 'manager' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
actionSchema.index({ vehicle_id: 1, created_at: -1 });

export const Vehicle = model('Vehicle', vehicleSchema);
export const VehicleAction = model('VehicleAction', actionSchema, 'vehicle_actions');
