// AnkiConnect client — gọi từ browser (client-side) đến AnkiConnect add-on (localhost:8765)
// AnkiConnect cho phép CORS từ localhost nên không cần proxy server
const ANKI_URL = "http://127.0.0.1:8765";
const VERSION = 6;

async function invoke<T = unknown>(action: string, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANKI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, version: VERSION, params: params ?? {} }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result as T;
}

export interface DeckStats {
  deck_id: number;
  name: string;
  new_count: number;
  learn_count: number;
  review_count: number;
  total_in_deck: number;
}

export interface AnkiOverview {
  decks: DeckStats[];
  totalDue: number;
  totalNew: number;
  totalCards: number;
  isConnected: boolean;
}

// Các deck cần theo dõi (match với Subject.code trong hệ thống)
const TRACKED_DECKS = ["TOEIC", "BCT3", "HSK5", "JP_N3"];

export async function getAnkiOverview(): Promise<AnkiOverview> {
  try {
    // Lấy thống kê của tất cả tracked decks + sub-decks của chúng
    const allDecks = await invoke<string[]>("deckNames");

    // Lọc các deck liên quan
    const relevant = allDecks.filter((d) =>
      TRACKED_DECKS.some((t) => d.startsWith(t) || d === t)
    );

    if (relevant.length === 0) {
      return { decks: [], totalDue: 0, totalNew: 0, totalCards: 0, isConnected: true };
    }

    const statsMap = await invoke<Record<string, DeckStats>>("getDeckStats", { decks: relevant });
    const decks = Object.values(statsMap);

    // Nhóm lại theo deck cha (tránh đếm trùng sub-decks)
    const parentDecks = decks.filter((d) => TRACKED_DECKS.includes(d.name));
    // Nếu chưa có parent deck thống kê, dùng tất cả
    const usedDecks = parentDecks.length > 0 ? parentDecks : decks;

    return {
      decks: usedDecks,
      totalDue: usedDecks.reduce((s, d) => s + d.review_count + d.learn_count, 0),
      totalNew: usedDecks.reduce((s, d) => s + d.new_count, 0),
      totalCards: usedDecks.reduce((s, d) => s + d.total_in_deck, 0),
      isConnected: true,
    };
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return { decks: [], totalDue: 0, totalNew: 0, totalCards: 0, isConnected: false };
    }
    throw err;
  }
}

// Lấy số thẻ đến hạn hôm nay theo query
export async function getDueCards(deckName: string): Promise<number> {
  try {
    const cards = await invoke<number[]>("findCards", {
      query: `deck:"${deckName}" is:due`,
    });
    return cards.length;
  } catch {
    return 0;
  }
}

// Kiểm tra Anki đang mở và AnkiConnect đang chạy
export async function checkAnkiConnection(): Promise<boolean> {
  try {
    await invoke("version");
    return true;
  } catch {
    return false;
  }
}
