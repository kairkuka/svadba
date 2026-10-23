import { Platform } from 'react-native';

import type { PortfolioMedia } from '../types';

type FileSystemModule = typeof import('expo-file-system');
type DirectoryInstance = InstanceType<FileSystemModule['Directory']>;

export type PersistedMediaResult = {
  media: PortfolioMedia[];
  missingCount: number;
};

export async function persistDraftMedia(media: PortfolioMedia[]) {
  if (Platform.OS === 'web') {
    return webMediaResult(media);
  }

  const { fileSystem, draftMediaDirectory } = await getMediaDirectories();
  return persistMedia(media, draftMediaDirectory, fileSystem);
}

export async function persistPortfolioMedia(
  itemId: string,
  media: PortfolioMedia[],
) {
  if (Platform.OS === 'web') {
    return webMediaResult(media);
  }

  const { fileSystem, portfolioMediaDirectory } = await getMediaDirectories();
  const itemDirectory = new fileSystem.Directory(
    portfolioMediaDirectory,
    sanitizePathSegment(itemId),
  );
  return persistMedia(media, itemDirectory, fileSystem);
}

export async function clearDraftMedia() {
  if (Platform.OS === 'web') {
    return;
  }

  const { draftMediaDirectory } = await getMediaDirectories();
  deleteDirectory(draftMediaDirectory);
}

export async function clearPortfolioMedia(itemId: string) {
  if (Platform.OS === 'web') {
    return;
  }

  const { fileSystem, portfolioMediaDirectory } = await getMediaDirectories();
  deleteDirectory(
    new fileSystem.Directory(
      portfolioMediaDirectory,
      sanitizePathSegment(itemId),
    ),
  );
}

export async function cleanupPortfolioMedia(activeItemIds: string[]) {
  if (Platform.OS === 'web') {
    return;
  }

  const { fileSystem, portfolioMediaDirectory } = await getMediaDirectories();

  if (!portfolioMediaDirectory.exists) {
    return;
  }

  const activeDirectories = new Set(activeItemIds.map(sanitizePathSegment));

  for (const entry of portfolioMediaDirectory.list()) {
    if (
      entry instanceof fileSystem.Directory &&
      !activeDirectories.has(entry.name)
    ) {
      entry.delete();
    }
  }
}

export async function clearAllMedia() {
  if (Platform.OS === 'web') {
    return;
  }

  const { appMediaDirectory } = await getMediaDirectories();
  deleteDirectory(appMediaDirectory);
}

async function getMediaDirectories() {
  const fileSystem = await import('expo-file-system');
  const appMediaDirectory = new fileSystem.Directory(
    fileSystem.Paths.document,
    'svadba-media',
  );
  const draftMediaDirectory = new fileSystem.Directory(
    appMediaDirectory,
    'draft',
  );
  const portfolioMediaDirectory = new fileSystem.Directory(
    appMediaDirectory,
    'portfolio',
  );

  return {
    fileSystem,
    appMediaDirectory,
    draftMediaDirectory,
    portfolioMediaDirectory,
  };
}

async function persistMedia(
  mediaItems: PortfolioMedia[],
  destinationDirectory: DirectoryInstance,
  fileSystem: FileSystemModule,
): Promise<PersistedMediaResult> {
  destinationDirectory.create({ idempotent: true, intermediates: true });

  const persistedMedia: PortfolioMedia[] = [];
  const activeFileNames = new Set<string>();
  let missingCount = 0;

  for (const media of mediaItems) {
    if (!isLocalUri(media.uri)) {
      persistedMedia.push(media);
      continue;
    }

    const fileName = mediaFileName(media, fileSystem);
    const destination = new fileSystem.File(destinationDirectory, fileName);
    activeFileNames.add(fileName);

    if (media.uri === destination.uri && destination.exists) {
      persistedMedia.push(media);
      continue;
    }

    const source = new fileSystem.File(media.uri);

    if (!source.exists) {
      missingCount += 1;
      continue;
    }

    await source.copy(destination, { overwrite: true });
    persistedMedia.push({ ...media, uri: destination.uri });
  }

  for (const entry of destinationDirectory.list()) {
    if (
      entry instanceof fileSystem.File &&
      !activeFileNames.has(entry.name)
    ) {
      entry.delete();
    }
  }

  return { media: persistedMedia, missingCount };
}

function deleteDirectory(directory: DirectoryInstance) {
  if (directory.exists) {
    directory.delete();
  }
}

function mediaFileName(media: PortfolioMedia, fileSystem: FileSystemModule) {
  const extension =
    fileSystem.Paths.extname(media.fileName) ||
    (media.type === 'video' ? '.mp4' : '.jpg');
  return `${sanitizePathSegment(media.id)}${extension.toLowerCase()}`;
}

function webMediaResult(media: PortfolioMedia[]): PersistedMediaResult {
  return { media, missingCount: 0 };
}

function sanitizePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function isLocalUri(uri: string) {
  return !/^https?:\/\//i.test(uri) && !uri.startsWith('data:');
}
