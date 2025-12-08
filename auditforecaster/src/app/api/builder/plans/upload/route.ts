import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { logger } from "@/lib/logger";

// Allowed file types for builder plans
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const builderId = formData.get("builderId") as string;
        const title = formData.get("title") as string;
        const description = formData.get("description") as string;

        if (!file || !builderId || !title) {
            return new NextResponse("Missing required fields", { status: 400 });
        }

        // Validate builderId format (UUID only - prevents path traversal)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(builderId)) {
            return new NextResponse("Invalid builder ID format", { status: 400 });
        }

        // Validate file type
        if (!ALLOWED_TYPES.includes(file.type)) {
            return new NextResponse(`Invalid file type. Allowed: PDF, JPEG, PNG, WebP`, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return new NextResponse(`File too large. Maximum size is 50MB`, { status: 400 });
        }

        // In a real production app with Unraid, we might save to a mounted volume
        // For now, we'll simulate saving to a public uploads folder or similar
        // NOTE: In production Docker, ensure /app/public/uploads is mounted/writable

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename - sanitize original name to prevent path traversal
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const originalName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
        const extension = (file.name.split('.').pop() || 'bin').replace(/[^a-zA-Z0-9]/g, '');
        const filename = `${originalName}-${uniqueSuffix}.${extension}`;

        // Ensure uploads directory exists (in a real app, check/create on startup)
        // For this implementation, we'll assume a 'uploads' folder in public or use a relative path
        // saving to ./public/uploads
        const uploadDir = join(process.cwd(), "public", "uploads");
        const filepath = join(uploadDir, filename);

        // Ensure upload directory exists and write file
        try {
            await mkdir(uploadDir, { recursive: true });
            await writeFile(filepath, buffer);
        } catch (e) {
            logger.error("Failed to write file to disk", { error: e, filepath });
            return new NextResponse("Failed to save file", { status: 500 });
        }

        const plan = await prisma.plan.create({
            data: {
                title,
                description,
                builderId,
                pdfUrl: `/uploads/${filename}`,
            },
        });

        return NextResponse.json(plan);
    } catch (error) {
        logger.error("Plan upload error", { error });
        return new NextResponse("Internal Error", { status: 500 });
    }
}
