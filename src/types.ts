export interface CardNewsItem {
  number: number;
  title: string;
  description: string;
}

export interface CardNewsData {
  mainTitle: string;
  items: CardNewsItem[];
}
