import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IGenerationTask extends Document {
    taskId: string;
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: Date;
    updatedAt: Date;
    result?: {
        success: boolean;
        bandeName?: string;
        usedModel?: string;
        pixelPerfect?: boolean;
        usedOpenAI?: boolean;
        pageTsx?: string;
        configJson?: string;
        pageTsxUrl?: string;
        configJsonUrl?: string;
        storageKeyPrefix?: string;
        description?: string;
        raw?: any;
        abstractBandeId?: string;
        bandeId?: string;
        assistantMessage?: string;
    };
    error?: {
        message: string;
        details?: any;
    };
}

const GenerationTaskSchema = new Schema<IGenerationTask>(
    {
        taskId: { type: String, required: true, unique: true, index: true },
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        result: {
            success: { type: Boolean },
            bandeName: { type: String },
            usedModel: { type: String },
            pixelPerfect: { type: Boolean },
            usedOpenAI: { type: Boolean },
            pageTsx: { type: String },
            configJson: { type: String },
            pageTsxUrl: { type: String },
            configJsonUrl: { type: String },
            storageKeyPrefix: { type: String },
            description: { type: String },
            raw: { type: Schema.Types.Mixed },
            abstractBandeId: { type: String },
            bandeId: { type: String },
            assistantMessage: { type: String },
        },
        error: {
            message: { type: String },
            details: { type: Schema.Types.Mixed },
        },
    },
    { timestamps: true, collection: "generation_tasks" }
);

export const GenerationTask: Model<IGenerationTask> =
    (mongoose.models.GenerationTask as Model<IGenerationTask>) ||
    mongoose.model<IGenerationTask>("GenerationTask", GenerationTaskSchema);
