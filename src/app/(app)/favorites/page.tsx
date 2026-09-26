import { FileExplorer } from '@/components/FileExplorer'

export default function FavoritesPage() {
  return (
    <div className="animate-fadeUp">
      <h1 className="text-2xl font-bold text-ink mb-5">Favorites</h1>
      <FileExplorer mode="favorites" />
    </div>
  )
}
