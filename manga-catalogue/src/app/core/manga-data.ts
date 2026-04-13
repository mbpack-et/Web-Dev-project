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
