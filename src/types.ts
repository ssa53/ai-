export interface CardNewsItem {
  number: number;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface RelatedProduct {
  name: string;
  reason: string;
}

export interface CardNewsData {
  mainTitle: string;
  items: CardNewsItem[];
  relatedProducts: RelatedProduct[];
}
