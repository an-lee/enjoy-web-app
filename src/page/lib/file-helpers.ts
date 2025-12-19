/**
 * File Helper Utilities
 *
 * Helper functions for converting between File and FileSystemFileHandle
 */

/**
 * Get fileHandle from File using File System Access API
 *
 * This requires user interaction to save the file, which will create a fileHandle.
 * Use this when you have a File object but need a fileHandle for storage.
 *
 * @param file - File object to create handle for
 * @returns FileSystemFileHandle or null if user cancels
 */
export async function getFileHandleFromFile(
  file: File
): Promise<FileSystemFileHandle | null> {
  if (!('showSaveFilePicker' in window)) {
    throw new Error(
      'File System Access API is not supported. ' +
      'Please use showOpenFilePicker to select files directly.'
    )
  }

  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: file.name,
      types: [
        {
          description: 'Media file',
          accept: {
            [file.type || 'application/octet-stream']: [`.${file.name.split('.').pop()}`],
          },
        },
      ],
    })

    // Write the file content
    const writable = await handle.createWritable()
    await writable.write(file)
    await writable.close()

    return handle
  } catch (error) {
    // User cancelled
    if ((error as Error).name === 'AbortError') {
      return null
    }
    throw error
  }
}

/**
 * Select file using File System Access API
 *
 * This is the preferred method for file selection as it directly returns a fileHandle.
 *
 * @param options - File picker options
 * @returns FileSystemFileHandle or null if user cancels
 */
export async function selectFileWithHandle(
  options?: {
    types?: Array<{
      description?: string
      accept: Record<string, string[]>
    }>
    multiple?: boolean
    excludeAcceptAllOption?: boolean
  }
): Promise<FileSystemFileHandle | null> {
  if (!('showOpenFilePicker' in window)) {
    throw new Error('File System Access API is not supported in this browser')
  }

  try {
    const handles = await (window as any).showOpenFilePicker({
      types: options?.types,
      multiple: options?.multiple || false,
      excludeAcceptAllOption: options?.excludeAcceptAllOption || false,
    })

    return options?.multiple ? handles : handles[0] || null
  } catch (error) {
    // User cancelled
    if ((error as Error).name === 'AbortError') {
      return null
    }
    throw error
  }
}
