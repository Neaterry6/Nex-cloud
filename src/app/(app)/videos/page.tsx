import { FileExplorer } from '@/components/FileExplorer'

export default function VideosPage() {
  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-bold text-ink mb-5">Videos</h1>
      <FileExplorer mode="videos" />
    </div>
  )
}
