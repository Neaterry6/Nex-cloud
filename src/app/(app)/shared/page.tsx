import { FileExplorer } from '@/components/FileExplorer'

export default function SharedPage() {
  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-bold text-ink mb-5">Shared with me</h1>
      <FileExplorer mode="shared" />
    </div>
  )
}
