/**
 * Type definitions for ImportMediaDialog
 */

export interface ImportMediaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (
    fileHandle: FileSystemFileHandle | null,
    file: File,
    metadata: MediaMetadata
  ) => Promise<void>
}

export interface MediaMetadata {
  title: string
  description?: string
  language: string
}

export interface FileSelectorProps {
  selectedFile: File | null
  isDragging: boolean
  onFileSelect: (file: File | null) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onBrowseClick: () => Promise<boolean | void>
}

export interface MetadataFormProps {
  title: string
  description: string
  language: string
  level: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onLanguageChange: (value: string) => void
  onLevelChange: (value: string) => void
}

