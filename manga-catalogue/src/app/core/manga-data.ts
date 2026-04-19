export type MangaStatus = 'Reading' | 'Completed' | 'Plan to Read';
export type PanelTone = 'plum' | 'indigo' | 'sky' | 'gold';

export interface MangaEntry {
  id: string;
  title: string;
  image: string;
  genre: string[];
  year: number;
  popularity: number;
  chapters: number;
  status: MangaStatus;
  synopsis: string;
  accent: PanelTone;
  author: string;
  updated: string;
  latestChapter: string;
}

export interface FriendEntry {
  id: number;
  name: string;
  handle: string;
  currentlyReading?: string;
}

export interface ApiFilterOption {
  id: string;
  name?: string;
  type?: string;
}

export interface MangaListResponse {
  mangaList: Array<{
    id: string;
    image: string;
    title: string;
    chapter: string;
    view: string;
    description: string;
  }>;
  metaData: {
    totalStories?: number;
    totalPages?: number;
    type: ApiFilterOption[];
    state: ApiFilterOption[];
    category: ApiFilterOption[];
  };
}

export interface MangaDetailResponse {
  imageUrl: string;
  name: string;
  author: string;
  description?: string;
  year?: number | null;
  status: string;
  updated: string;
  view: string;
  genres: string[];
  chapterList: Array<{
    id: string;
    path: string;
    name: string;
    view: string;
    createdAt: string;
  }>;
}

export interface AuthResponse {
  user: {
    id: number;
    username: string;
    email: string;
  };
  tokens: {
    refresh: string;
    access: string;
  };
}

export interface ReadingListEntryResponse {
  id: number;
  status: 'PLANNED' | 'READING' | 'COMPLETED';
  manga_id: number;
  manga_external_id: string;
  manga_title: string;
  manga_cover_image: string;
  added_at: string;
}

export interface ReviewEntryResponse {
  id: number;
  manga_title: string;
  manga_external_id: string;
  user: {
    id: number;
    username: string;
    email: string;
  };
  score: number;
  comment: string;
  created_at: string;
}

export interface ReviewSummaryResponse {
  reviews: ReviewEntryResponse[];
  average_score: number | null;
  reviews_count: number;
  user_review?: ReviewEntryResponse | null;
}

export const FRIENDS_LIST: FriendEntry[] = [
  {
    id: 1,
    name: 'Nora Hayashi',
    handle: '@nora.panels'
  },
  {
    id: 2,
    name: 'Jun Park',
    handle: '@junreads'
  },
  {
    id: 3,
    name: 'Mika Santos',
    handle: '@mika.manga'
  }
];
