import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Clock, Search } from 'lucide-react'

// Document 型定義
type Document = {
  id: string
  title: string
  image_paths: string[]
  expires_at: string | null
  category: { id: string; name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // 最新の書類を取得 (10件)
  const { data: recentDocs, error: recentError } = await supabase
    .from('documents')
    .select(`
      id, title, image_paths, expires_at,
      category:categories(id, name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // 期限間近（7日以内）または期限切れの書類を取得 (通知用)
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  
  const { data: expiringDocs } = await supabase
    .from('documents')
    .select('id, title, expires_at')
    .eq('user_id', user.id)
    .not('expires_at', 'is', null)
    .lte('expires_at', nextWeek.toISOString().split('T')[0])
    .order('expires_at', { ascending: true })

  // Storageから署名付きURLを生成
  const recentDocsWithUrls = await Promise.all((recentDocs || []).map(async (doc) => {
    let firstImageUrl = ''
    if (doc.image_paths && doc.image_paths.length > 0) {
      const { data } = await supabase.storage.from('document-images').createSignedUrl(doc.image_paths[0], 3600)
      firstImageUrl = data?.signedUrl || ''
    }
    return { ...doc, firstImageUrl }
  }))

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto space-y-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </header>

      {/* アラート領域（期限切れ・期限間近） */}
      {expiringDocs && expiringDocs.length > 0 && (
        <section>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive text-sm">Action Required</h3>
              <p className="text-sm text-destructive/80 mt-1 mb-2">
                You have {expiringDocs.length} document(s) expiring soon.
              </p>
              <div className="flex flex-col gap-2">
                {expiringDocs.slice(0, 3).map(doc => (
                  <Link href={`/documents/${doc.id}`} key={doc.id} className="text-xs font-medium text-destructive hover:underline block truncate">
                    • {doc.title} ({doc.expires_at})
                  </Link>
                ))}
                {expiringDocs.length > 3 && (
                  <span className="text-xs text-destructive/70">and {expiringDocs.length - 3} more...</span>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 最近のドキュメント領域 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            Recent Documents
          </h2>
          <Link href="/search" className="text-sm text-primary hover:underline flex items-center gap-1">
            View All <Search className="w-3 h-3" />
          </Link>
        </div>
        
        {recentDocsWithUrls && recentDocsWithUrls.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {recentDocsWithUrls.map((doc: any) => (
              <Link href={`/documents/${doc.id}`} key={doc.id}>
                <Card className="overflow-hidden hover:border-primary/50 transition-colors h-full flex flex-col">
                  <div className="aspect-[3/4] bg-muted relative border-b shrink-0">
                    {doc.firstImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={doc.firstImageUrl} 
                        alt={doc.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                        No Image
                      </div>
                    )}
                    
                    {/* 複数ページインジケーター */}
                    {doc.image_paths && doc.image_paths.length > 1 && (
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm">
                        {doc.image_paths.length} pages
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col justify-between">
                    <p className="font-medium text-sm line-clamp-2 leading-tight mb-2">{doc.title}</p>
                    {doc.category && (
                      <div className="mt-auto">
                        <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-full inline-block">
                          {doc.category.name}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          /* ドキュメント0件の時のEmpty state */
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
            <p className="text-muted-foreground mb-4">No documents found.</p>
            <Link href="/upload" className="text-primary font-medium hover:underline">
              Add your first document
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
