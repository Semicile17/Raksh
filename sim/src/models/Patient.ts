import mongoose, { Schema, Document } from 'mongoose';

export interface IPatient extends Document {
  patient_id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  ward: string;
  bed_number: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema: Schema = new Schema(
  {
    patient_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    ward: { type: String, required: true },
    bed_number: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);
