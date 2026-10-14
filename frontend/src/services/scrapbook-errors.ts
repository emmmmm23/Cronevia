/** Keep database/storage diagnostics out of the writing experience. */
export function scrapbookError(error: unknown, action: 'load' | 'save' | 'stickers' | 'upload'): string {
  const raw = error instanceof Error ? error.message : String(error)
  console.warn(`[scrapbook:${action}]`, error)
  if (action === 'load') return 'Your saved decorations couldn’t be opened. Saving is paused to keep them safe. Please retry loading.'
  if (action === 'save') return /upload/i.test(raw)
    ? 'One of your uploads isn’t ready. Retry it, then save again. Your changes are still here.'
    : 'Your entry couldn’t be saved. Your changes are still here — please try again.'
  if (/bucket|schema cache|relation .*does not exist|PGRST/i.test(raw)) return 'Your private sticker storage isn’t ready yet. The Library is still available. Please contact the app owner to finish setup.'
  if (action === 'stickers') return 'Your stickers couldn’t be opened. Try again in a moment; you can still use the Library.'
  if (/Only PNG|File size|dimensions|transparency|decode|Invalid sticker/i.test(raw)) return raw
  return 'The upload didn’t finish. Your file is kept here so you can retry.'
}
