/**
 * Fire-and-forget Telegram admin notifications.
 *
 * Best-effort by design: a failed notification must never fail the buyer's
 * request. If the bot token / chat id are not configured, it silently no-ops so
 * local development and previews don't error.
 */
export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
  } catch (error) {
    console.error('[telegram] notification failed:', error);
  }
}

/** Format an IDR amount as e.g. "Rp 62.317". */
export function formatIDR(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}
