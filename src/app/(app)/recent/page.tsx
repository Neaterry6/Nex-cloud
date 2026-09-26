import { FileExplorer } from '@/components/FileExplorer'

export default function RecentPage() {
  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-bold text-ink mb-5">Recent</h1>
      <FileExplorer mode="recent" />
    </div>
  )
}
