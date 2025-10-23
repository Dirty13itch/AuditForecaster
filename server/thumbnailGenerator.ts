import sharp from "sharp";
import { randomUUID } from "crypto";
import { ObjectStorageService, objectStorageClient } from "./objectStorage";
import { getObjectAclPolicy, setObjectAclPolicy } from "./objectAcl";
import { serverLogger } from "./logger";

const THUMBNAIL_MAX_DIMENSION = 200;
const THUMBNAIL_QUALITY = 80;

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

export async function generateThumbnail(originalPath: string): Promise<string> {
  try {
    serverLogger.info(`[ThumbnailGenerator] Starting thumbnail generation for ${originalPath}`);
    
    const objectStorageService = new ObjectStorageService();
    
    // Get the original file from object storage
    const originalFile = await objectStorageService.getObjectEntityFile(originalPath);
    
    // Download the original image
    const [imageBuffer] = await originalFile.download();
    serverLogger.info(`[ThumbnailGenerator] Downloaded original image (${imageBuffer.length} bytes)`);
    
    // Generate thumbnail using Sharp
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(THUMBNAIL_MAX_DIMENSION, THUMBNAIL_MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
    
    serverLogger.info(`[ThumbnailGenerator] Generated thumbnail (${thumbnailBuffer.length} bytes)`);
    
    // Extract bucket and object info from original path
    const privateObjectDir = objectStorageService.getPrivateObjectDir();
    let entityDir = privateObjectDir;
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    
    // Generate thumbnail path (extract ID from original path and add -thumb suffix)
    const originalPathParts = originalPath.split("/");
    const originalId = originalPathParts[originalPathParts.length - 1];
    const thumbnailId = `${originalId.replace(/\.[^.]+$/, '')}-thumb.jpg`;
    const thumbnailObjectPath = `${entityDir}uploads/${thumbnailId}`;
    
    // Parse the thumbnail path to get bucket and object name
    const { bucketName, objectName } = parseObjectPath(thumbnailObjectPath);
    
    // Upload thumbnail to object storage
    const bucket = objectStorageClient.bucket(bucketName);
    const thumbnailFile = bucket.file(objectName);
    
    await thumbnailFile.save(thumbnailBuffer, {
      contentType: 'image/jpeg',
      resumable: false,
    });
    
    serverLogger.info(`[ThumbnailGenerator] Uploaded thumbnail to ${thumbnailObjectPath}`);
    
    // Copy ACL policy from original to thumbnail
    try {
      const originalAcl = await getObjectAclPolicy(originalFile);
      if (originalAcl) {
        await setObjectAclPolicy(thumbnailFile, originalAcl);
        serverLogger.info(`[ThumbnailGenerator] Copied ACL policy to thumbnail`);
      }
    } catch (aclError) {
      serverLogger.error(`[ThumbnailGenerator] Failed to copy ACL policy:`, aclError);
      // Don't fail the whole operation if ACL copy fails
    }
    
    // Return the canonical thumbnail path
    const thumbnailPath = `/objects/uploads/${thumbnailId}`;
    serverLogger.info(`[ThumbnailGenerator] Thumbnail generation complete: ${thumbnailPath}`);
    
    return thumbnailPath;
  } catch (error) {
    serverLogger.error(`[ThumbnailGenerator] Failed to generate thumbnail for ${originalPath}:`, error);
    throw error;
  }
}
