import { FileExplorer } from '@/components/FileExplorer'

export default function PhotosPage() {
  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-bold text-ink mb-5">Photos</h1>
      <FileExplorer mode="photos" />
    </div>
  )
}
