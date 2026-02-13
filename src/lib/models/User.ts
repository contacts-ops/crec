// lib/models/User.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type Theme = "light" | "dark";
export type Role = 'admin' | 'developer' | 'provider' | 'client';


export interface IUserWithIsOwner extends IUser {
  isOwner?: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role: Role;
  createdAt: Date; // Should be managed by timestamps: true
  updatedAt: Date; // Should be managed by timestamps: true
  verificationCode?: string;
  resetToken?: string;
  resetExpires?: Date;
  theme?: Theme;
  currentBandes?: Types.ObjectId[]; // Liste de références aux Bandes sur lesquelles l'utilisateur travaille (maximum 2)
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: { type: String, required: true, enum: ["admin", "developer", "provider", "client"] },
    verificationCode: { type: String },
    resetToken: { type: String },
    resetExpires: { type: Date },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    currentBandes: { 
      type: [Schema.Types.ObjectId], 
      ref: 'Bande', 
      required: false,
      validate: {
        validator: function(v: Types.ObjectId[]) {
          return !v || v.length <= 2;
        },
        message: 'Un utilisateur ne peut avoir au maximum que 2 bandes en cours de développement'
      }
    }, // Liste de références aux Bandes (maximum 2)
  },
  { timestamps: true } // Ceci ajoute createdAt et updatedAt automatiquement
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
