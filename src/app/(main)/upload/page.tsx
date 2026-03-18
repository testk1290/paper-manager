'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { compressImage } from '@/lib/utils/image-compression'
import { createSupabaseClient } from '@/lib/supabase/client'
import { submitDocument } from './actions'
import { v4 as uuidv4 } from 'uuid'

export default function UploadPage() {
  const router = useRouter()
  const supabase = createSupabaseClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [images, setImages] = useState<{ id: string; file: File; preview: string }[]>([])
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [note, setNote] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const files = Array.from(e.target.files)

    const newImages = await Promise.all(
      files.map(async (file) => {
        const compressed = await compressImage(file)
        return {
          id: uuidv4(),
          file: compressed,
          preview: URL.createObjectURL(compressed),
        }
      })
    )
    
    setImages((prev) => [...prev, ...newImages])
    // リセットして同じ画像も選べるようにする
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveImage = (idToRemove: string) => {
    setImages((prev) => {
      const filtered = prev.filter(img => img.id !== idToRemove)
      // メモリ解放
      const target = prev.find(i => i.id === idToRemove)
      if (target) URL.revokeObjectURL(target.preview)
      return filtered
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) {
      setErrorText('Title is required')
      return
    }
    if (images.length === 0) {
      setErrorText('Please add at least one image')
      return
    }

    setIsSubmitting(true)
    setErrorText('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const documentId = uuidv4()
      const imagePaths: string[] = []

      // 1. 画像群をStorageにアップロード
      for (let i = 0; i < images.length; i++) {
        const image = images[i]
        const ext = image.file.name.split('.').pop() || 'jpg'
        const filePath = `${user.id}/${documentId}/${image.id}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('document-images')
          .upload(filePath, image.file)

        if (uploadError) throw uploadError
        imagePaths.push(filePath)
      }

      // 2. メタデータをServer Action経由でDBに保存
      const formData = new FormData()
      formData.append('title', title)
      formData.append('categoryId', categoryId)
      formData.append('tags', tags)
      formData.append('expiresAt', expiresAt)
      formData.append('note', note)
      formData.append('imagePaths', JSON.stringify(imagePaths))

      const result = await submitDocument(formData)

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit document')
      }

      // 成功時 リダイレクト
      router.push('/dashboard')

    } catch (err: any) {
      console.error(err)
      setErrorText(err.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 pb-20 max-w-2xl mx-auto space-y-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Upload Document</h1>
      </header>

      {errorText && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm mb-4">
          {errorText}
        </div>
      )}

      {/* 画像プレビュー＆追加エリア */}
      <section>
        <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
          {/* 隠しインプット */}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />

          {/* 追加ボタン */}
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 w-32 h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors text-muted-foreground snap-start"
          >
            <Camera className="w-8 h-8" />
            <span className="text-sm font-medium">Add Page</span>
          </button>
          
          {/* プレビュー表示 */}
          {images.map((image, i) => (
             <div key={image.id} className="shrink-0 w-32 h-40 bg-muted rounded-xl relative snap-start overflow-hidden border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt={`Preview ${i+1}`} className="object-cover w-full h-full" />
                <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-sm">
                  Page {i+1}
                </div>
                <button 
                  type="button" 
                  onClick={() => handleRemoveImage(image.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
             </div>
          ))}
        </div>
      </section>

      {/* フォームエリア */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input 
            id="title" 
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter document title" 
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Categories TODO: Fetch from DB in real implementation */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select 
            id="category" 
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            disabled={isSubmitting}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select a category</option>
            {/* MVP用 仮の静的カテゴリリスト。将来的にDBからfetch */}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input 
            id="tags" 
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Add tags (comma separated)" 
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expires">Expiration Date (Optional)</Label>
          <Input 
            id="expires" 
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)} 
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Notes</Label>
          <Textarea 
            id="note" 
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add any extra notes or keywords for searching" 
            className="h-24" 
            disabled={isSubmitting}
          />
        </div>

        {/* 保存ボタン */}
        <div className="pt-4">
          <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Document'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
