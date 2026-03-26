'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect(`/login?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createSupabaseServerClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect(`/signup?message=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signout() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function updatePassword(formData: FormData) {
  const supabase = await createSupabaseServerClient()
  
  const newPassword = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  
  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  
  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function adminUpdateUserPassword(formData: FormData) {
  // まず、実行ユーザーが管理者かどうかをチェックする
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { error: 'Not authenticated' }
  }

  const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : []
  if (!adminEmails.includes(user.email)) {
    return { error: 'Unauthorized: Not an administrator' }
  }

  const targetUserId = formData.get('userId') as string
  const newPassword = formData.get('newPassword') as string

  if (!targetUserId || !newPassword) {
    return { error: 'Missing required fields' }
  }

  // 管理者権限クライアントを利用して強制変更
  const { supabaseAdmin } = await import('@/lib/supabase/admin')
  const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return { success: true }
}
