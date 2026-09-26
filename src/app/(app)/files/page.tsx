import { FileExplorer } from '@/components/FileExplorer'

export default function FilesPage({ searchParams }: { searchParams: { folder?: string } }) {
  return (
    <div className="animate-fadeUp">
      <FileExplorer mode="files" folderId={searchParams.folder ?? null} />
    </div>
  )
}
