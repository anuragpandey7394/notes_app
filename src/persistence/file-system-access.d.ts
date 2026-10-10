/**
 * Ambient declarations for the parts of the File System Access API that are
 * not yet in TypeScript's bundled DOM lib.
 *
 * These merge into the existing DOM interfaces, so no dependency such as
 * `@types/wicg-file-system-access` is needed. Only what this app actually uses
 * is declared.
 */

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemHandle {
  /** Current permission without prompting. Resolves any time. */
  queryPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>

  /** Asks the user for permission. Must be called from a user gesture. */
  requestPermission(
    descriptor?: FileSystemHandlePermissionDescriptor,
  ): Promise<PermissionState>
}

interface DirectoryPickerOptions {
  id?: string
  mode?: 'read' | 'readwrite'
  startIn?:
    | 'desktop'
    | 'documents'
    | 'downloads'
    | 'music'
    | 'pictures'
    | 'videos'
    | FileSystemHandle
}

interface Window {
  showDirectoryPicker?(
    options?: DirectoryPickerOptions,
  ): Promise<FileSystemDirectoryHandle>
}
