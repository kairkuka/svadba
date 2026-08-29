import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { PortfolioMedia } from '../types';

const MAX_IMAGE_EDGE = 1920;
const IMAGE_QUALITY = 0.82;

export async function preparePortfolioMedia(
  mediaItems: PortfolioMedia[],
  onProgress?: (progress: number) => void,
) {
  if (mediaItems.length === 0) {
    onProgress?.(1);
    return mediaItems;
  }

  const preparedMedia: PortfolioMedia[] = [];

  for (const [index, media] of mediaItems.entries()) {
    preparedMedia.push(
      media.type === 'image' ? await optimizeImage(media) : media,
    );
    onProgress?.((index + 1) / mediaItems.length);
  }

  return preparedMedia;
}

async function optimizeImage(media: PortfolioMedia): Promise<PortfolioMedia> {
  if (media.optimized) {
    return media;
  }

  const context = ImageManipulator.manipulate(media.uri);
  const longestEdge = Math.max(media.width, media.height);

  if (longestEdge > MAX_IMAGE_EDGE) {
    if (media.width >= media.height) {
      context.resize({ width: MAX_IMAGE_EDGE });
    } else {
      context.resize({ height: MAX_IMAGE_EDGE });
    }
  }

  const renderedImage = await context.renderAsync();
  const result = await renderedImage.saveAsync({
    compress: IMAGE_QUALITY,
    format: SaveFormat.JPEG,
  });

  return {
    ...media,
    uri: result.uri,
    fileName: replaceExtension(media.fileName, 'jpg'),
    mimeType: 'image/jpeg',
    width: result.width,
    height: result.height,
    fileSize: undefined,
    optimized: true,
  };
}

function replaceExtension(fileName: string, extension: string) {
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '');
  return `${nameWithoutExtension || 'portfolio'}.${extension}`;
}
