'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

interface UploadResult {
  success: boolean
  error?: string
}

export async function submitDocument(formData: FormData): Promise<UploadResult> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  const categoryId = formData.get('categoryId') as string || null
  const expiresAt = formData.get('expiresAt') as string || null
  const note = formData.get('note') as string || ''
  
  // Storageへアップロードした画像のパスリスト
  // 今回のMVPでは Server Action ではなく Client 側で直接 Storage へアップロードし、
  // パス群だけを json で formData に詰めて送る方式を採用する方針とします。（ファイルのmultipart送信起因の制限回避のため）
  const imagePathsJson = formData.get('imagePaths') as string
  let imagePaths: string[] = []
  
  try {
    imagePaths = JSON.parse(imagePathsJson)
  } catch(e) {
    return { success: false, error: 'Invalid images data' }
  }

  // tags 処理
  const tagsString = formData.get('tags') as string
  const tagNames = tagsString ? tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0) : []

  // 1. Insert Document
  const documentId = uuidv4()
  const { error: docError } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      user_id: user.id,
      title,
      category_id: categoryId,
      expires_at: expiresAt,
      note,
      image_paths: imagePaths,
    })

  if (docError) {
    console.error('Document insert error:', docError)
    return { success: false, error: docError.message }
  }

  // 2. Tags 処理
  if (tagNames.length > 0) {
    for (const tagName of tagNames) {
      // 既存のタグを検索
      const { data: existingTags } = await supabase
        .from('tags')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', tagName)

      let tagId = existingTags?.[0]?.id

      if (!tagId) {
         // 新規タグ作成
         const newTagId = uuidv4()
         const { error: tagInsertError } = await supabase
           .from('tags')
           .insert({ id: newTagId, user_id: user.id, name: tagName })
         
         if (tagInsertError) continue
         tagId = newTagId
      }

      // 紐付け (document_tags)
      const { error: relError } = await supabase
        .from('document_tags')
        .insert({
          document_id: documentId,
          tag_id: tagId,
        })
        
        if(relError) {
            console.error('document_tag insert error', relError)
        }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/search')
  return { success: true }
}
