'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search as SearchIcon, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createSupabaseClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useDebounce } from 'use-debounce'

type Document = {
  id: string
  title: string
  note: string | null
  image_paths: string[]
  firstImageUrl?: string // 署名付きURL用に追加
  category: { id: string; name: string } | null
  tags: { tag: { id: string; name: string } }[]
}

type Category = {
  id: string
  name: string
}

export default function SearchPage() {
  const supabase = createSupabaseClient()
  
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword] = useDebounce(keyword, 300)
  
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // カテゴリ一覧の取得
  useEffect(() => {
    const fetchCategories = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name')
        
      if (data) setCategories(data)
    }
    fetchCategories()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ドキュメント一覧の取得（フィルタリング連動）
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('documents')
      .select(`
        id, title, note, image_paths,
        category:categories(id, name),
        tags:document_tags(tag:tags(id, name))
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // キーワード検索 (title または note)
    if (debouncedKeyword) {
      // note が null の場合もあるため、明示的に or を使う
      query = query.or(`title.ilike.%${debouncedKeyword}%,note.ilike.%${debouncedKeyword}%`)
    }

    // カテゴリ絞り込み
    if (selectedCategoryId) {
      query = query.eq('category_id', selectedCategoryId)
    }

    const { data } = await query
    
    // TODO: タグ名での検索が必要な場合は、ここで JS側でフィルタするか、PostgreSQLのRPC/Viewを使う
    // MVPにおいては、DB取得後にシンプルにJSでフィルタする
    let filteredData = data as Document[] | null
    if (filteredData && debouncedKeyword) {
      const lowerKeyword = debouncedKeyword.toLowerCase();
      filteredData = filteredData.filter(doc => 
        doc.title.toLowerCase().includes(lowerKeyword) ||
        (doc.note && doc.note.toLowerCase().includes(lowerKeyword)) ||
        doc.tags.some(t => t.tag.name.toLowerCase().includes(lowerKeyword))
      )
    }

    // 署名付きURLの解決
    const docsWithUrls = await Promise.all((filteredData || []).map(async doc => {
       let url = ''
       if (doc.image_paths && doc.image_paths.length > 0) {
          const { data } = await supabase.storage.from('document-images').createSignedUrl(doc.image_paths[0], 3600)
          url = data?.signedUrl || ''
       }
       return { ...doc, firstImageUrl: url }
    }))

    setDocuments(docsWithUrls)
    setIsLoading(false)
  }, [debouncedKeyword, selectedCategoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto space-y-4 flex flex-col h-[100dvh]">
      <header className="mb-2 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
      </header>

      {/* 検索バー */}
      <div className="relative shrink-0">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search by title, notes, or tags..." 
          className="pl-10 h-12 rounded-xl bg-muted/50 border-transparent focus-visible:bg-background"
        />
      </div>

      {/* フィルター・チップ */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0">
           {/* All ボタン */}
            <Button 
                variant={selectedCategoryId === null ? 'default' : 'secondary'} 
                size="sm" 
                className="shrink-0 rounded-full h-8 px-4"
                onClick={() => setSelectedCategoryId(null)}
            >
                All
            </Button>
            {/* カテゴリごとのボタン */}
            {categories.map(cat => (
                <Button 
                    key={cat.id}
                    variant={selectedCategoryId === cat.id ? 'default' : 'secondary'} 
                    size="sm" 
                    className="shrink-0 rounded-full h-8 px-4"
                    onClick={() => setSelectedCategoryId(cat.id)}
                >
                    {cat.name}
                </Button>
            ))}
        </div>
      )}

      {/* 検索結果 */}
      <div className="pt-2 space-y-3 overflow-y-auto flex-1 pb-4">
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Searching...</div>
        ) : documents.length > 0 ? (
          documents.map(doc => (
            <Link href={`/documents/${doc.id}`} key={doc.id} className="block">
              <Card className="flex items-start p-3 gap-4 cursor-pointer hover:border-primary/50 transition-colors">
                <div className="w-20 h-24 bg-muted rounded-md shrink-0 flex items-center justify-center text-xs text-muted-foreground relative overflow-hidden">
                   {doc.firstImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={doc.firstImageUrl} 
                        alt={doc.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>No Image</span>
                    )}
                </div>
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between h-full">
                  <div>
                    <h3 className="font-semibold text-base line-clamp-1">{doc.title}</h3>
                    {doc.note && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{doc.note}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doc.category && (
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full whitespace-nowrap">
                        {doc.category.name}
                      </span>
                    )}
                    {doc.tags && doc.tags.map(t => (
                      <span key={t.tag.id} className="text-[10px] border border-border px-2 py-0.5 rounded-full text-muted-foreground whitespace-nowrap">
                        {t.tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
            <p className="text-muted-foreground">No documents found.</p>
          </div>
        )}
      </div>
    </div>
  )
}
