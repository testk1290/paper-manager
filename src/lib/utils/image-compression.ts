import imageCompression from 'browser-image-compression'

export async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1, // 1MB以下に圧縮
    maxWidthOrHeight: 1920, // 最大1920px
    useWebWorker: true,
  }

  try {
    const compressedFile = await imageCompression(file, options)
    return compressedFile
  } catch (error) {
    console.error('画像圧縮エラー:', error)
    return file // エラー時はオリジナルを返す
  }
}
