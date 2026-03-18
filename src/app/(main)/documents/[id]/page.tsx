import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Clock, Calendar, Edit, Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { format, formatDistanceToNow, isPast } from 'date-fns'
import { revalidatePath } from 'next/cache'

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const docId = resolvedParams.id;
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // ドキュメント情報の取得
  const { data: doc, error } = await supabase
    .from('documents')
    .select(`
      *,
      category:categories(id, name),
      tags:document_tags(tag:tags(id, name))
    `)
    .eq('id', docId)
    .eq('user_id', user.id)
    .single()

  if (error || !doc) {
    notFound()
  }

  // StorageのURL生成 (Privateバケット対応のため署名付きURLを生成)
  const imageUrls = await Promise.all(
    (doc.image_paths || []).map(async (path: string) => {
      const { data } = await supabase.storage.from('document-images').createSignedUrl(path, 3600)
      return data?.signedUrl || ''
    })
  )

  const isExpired = doc.expires_at ? isPast(new Date(doc.expires_at)) : false

  // 削除アクション（Server Action）
  async function deleteDocument() {
    'use server'
    const supabaseAction = await createSupabaseServerClient()
    const { data: { user: currentUser } } = await supabaseAction.auth.getUser()
    if (!currentUser) return

    // 1. Storageから画像を削除
    if (doc.image_paths && doc.image_paths.length > 0) {
      await supabaseAction.storage.from('document-images').remove(doc.image_paths)
    }

    // 2. DBからドキュメント削除 (カスケード削除で document_tags も消える想定)
    await supabaseAction.from('documents').delete().eq('id', docId).eq('user_id', currentUser.id)

    revalidatePath('/dashboard')
    revalidatePath('/search')
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {/* 透過ヘッダー */}
      <header className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent text-white">
        <Link href="/dashboard" className="p-2 hover:bg-black/20 rounded-full transition-colors backdrop-blur-sm">
          <ArrowLeft className="w-6 h-6 drop-shadow-md" />
        </Link>
        <Button variant="ghost" size="icon" className="text-white hover:bg-black/20 hover:text-white rounded-full backdrop-blur-sm" disabled>
          <Edit className="w-5 h-5 drop-shadow-md" />
        </Button>
      </header>

      {/* 画像カルーセル */}
      <section className="relative bg-black w-full min-h-[40vh] max-h-[60vh] flex items-center justify-center">
        {imageUrls.length > 0 ? (
          <Carousel className="w-full h-full">
            <CarouselContent className="h-full">
              {imageUrls.map((url: string, index: number) => (
                <CarouselItem key={index} className="flex h-full items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`Page ${index + 1}`} className="max-h-full max-w-full object-contain" />
                  <div className="absolute bottom-6 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
                    {index + 1} / {imageUrls.length}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {imageUrls.length > 1 && (
              <>
                <CarouselPrevious className="left-4 bg-black/50 text-white border-none hover:bg-black/70" />
                <CarouselNext className="right-4 bg-black/50 text-white border-none hover:bg-black/70" />
              </>
            )}
          </Carousel>
        ) : (
          <div className="text-white/50 border border-white/20 p-12 flex flex-col items-center justify-center gap-2">
            <span className="text-sm">No Image</span>
          </div>
        )}
      </section>

      {/* ドキュメント情報 */}
      <section className="p-5 sm:p-6 space-y-6 bg-background flex-1 -mt-4 relative z-10 rounded-t-3xl border-t shadow-lg">
        
        {/* ヘッダー情報 */}
        <div>
          {doc.category && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-medium">
                {doc.category.name}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-bold mb-2">{doc.title}</h1>
        </div>

        {/* メタ情報 */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center text-sm text-muted-foreground gap-3">
            <Clock className="w-4 h-4 shrink-0" />
            <span>Uploaded: {format(new Date(doc.created_at), 'MMM d, yyyy')}</span>
          </div>
          
          {doc.expires_at && (
            <div className={`flex items-center text-sm font-medium gap-3 p-3 rounded-lg border ${isExpired ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
              <Calendar className="w-4 h-4 shrink-0" />
              <span>
                {isExpired ? 'Expired: ' : 'Expires: '}
                {format(new Date(doc.expires_at), 'MMM d, yyyy')}
                {' '}
                ({formatDistanceToNow(new Date(doc.expires_at), { addSuffix: true })})
              </span>
            </div>
          )}
        </div>

        {/* タグ */}
        {doc.tags && doc.tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
              <Settings2 className="w-4 h-4" /> Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((t: any) => (
                <span key={t.tag.id} className="text-xs border border-border px-3 py-1.5 rounded-full text-foreground/80 bg-background shadow-sm">
                  {t.tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* メモ */}
        {doc.note && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Notes</h3>
            <p className="text-sm text-foreground/90 bg-muted/30 border border-muted p-4 rounded-xl leading-relaxed whitespace-pre-wrap">
              {doc.note}
            </p>
          </div>
        )}

        {/* 削除ボタン */}
        <div className="pt-8 pb-8 mt-auto">
          <form action={deleteDocument}>
            <Button variant="outline" type="submit" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20" size="lg">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Document
            </Button>
          </form>
        </div>

      </section>
    </div>
  )
}
