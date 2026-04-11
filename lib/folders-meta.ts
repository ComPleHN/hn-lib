import { folders, type Folder } from "@/lib/projects-data"

export function getFolderById(id: string): Folder | undefined {
  return folders.find((f) => f.id === id)
}

export function folderRoute(folderId: string): string {
  return `/folders/${folderId}`
}
