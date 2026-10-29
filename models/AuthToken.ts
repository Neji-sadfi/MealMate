// Owner: Member 1 (auth + profile)
import { Schema, Types, model, models, type Model } from "mongoose";

export const AUTH_TOKEN_TYPES = ["password_reset", "email_verification"] as const;
export type AuthTokenType = (typeof AUTH_TOKEN_TYPES)[number];

/** One-time link token. Only a SHA-256 hash is stored, never the token sent by email. */
export interface IAuthToken {
  userId: Types.ObjectId;
  type: AuthTokenType;
  tokenHash: string;
  expiresAt: Date;
}

const authTokenSchema = new Schema<IAuthToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: AUTH_TOKEN_TYPES, required: true },
    tokenHash: { type: String, required: true, unique: true },
    // TTL index: MongoDB deletes expired tokens automatically.
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  { timestamps: true },
);

export const AuthToken: Model<IAuthToken> =
  (models.AuthToken as Model<IAuthToken>) ?? model<IAuthToken>("AuthToken", authTokenSchema);
