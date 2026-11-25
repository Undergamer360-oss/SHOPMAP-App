import type { ImageSource } from 'expo-image';

import { thumbnailKeyForProduct, type ThumbnailKey } from '@/data/thumbnail-keys';

/**
 * A small, local thumbnail library for a very large catalog.
 *
 * The store has ~2,900 products, so bundling one photo per product is not
 * practical offline. Instead, a compact set of Twemoji PNGs is bundled once
 * and resolved by product-name keywords (see `thumbnail-keys.ts`). Exact demo
 * items get curated matches; everything else falls back to a keyword, then a
 * department icon, then a shopping cart. This works offline in Expo Go and
 * costs nothing at runtime.
 *
 * Twemoji artwork is licensed CC BY 4.0: https://twemoji.twitter.com/
 */
const images = {
  apple: require('../../assets/thumbnails/apple.png'),
  bagel: require('../../assets/thumbnails/bagel.png'),
  banana: require('../../assets/thumbnails/banana.png'),
  beer: require('../../assets/thumbnails/beer.png'),
  bottle: require('../../assets/thumbnails/bottle.png'),
  bread: require('../../assets/thumbnails/bread.png'),
  broom: require('../../assets/thumbnails/broom.png'),
  cake: require('../../assets/thumbnails/cake.png'),
  carrot: require('../../assets/thumbnails/carrot.png'),
  cart: require('../../assets/thumbnails/cart.png'),
  canned: require('../../assets/thumbnails/canned.png'),
  cheese: require('../../assets/thumbnails/cheese.png'),
  chicken: require('../../assets/thumbnails/chicken.png'),
  chips: require('../../assets/thumbnails/chips.png'),
  chocolate: require('../../assets/thumbnails/chocolate.png'),
  coffee: require('../../assets/thumbnails/coffee.png'),
  cookie: require('../../assets/thumbnails/cookie.png'),
  croissant: require('../../assets/thumbnails/croissant.png'),
  cupcake: require('../../assets/thumbnails/cupcake.png'),
  egg: require('../../assets/thumbnails/egg.png'),
  fish: require('../../assets/thumbnails/fish.png'),
  gift: require('../../assets/thumbnails/gift.png'),
  ham: require('../../assets/thumbnails/ham.png'),
  honey: require('../../assets/thumbnails/honey.png'),
  hotDog: require('../../assets/thumbnails/hot-dog.png'),
  ice: require('../../assets/thumbnails/ice.png'),
  iceCream: require('../../assets/thumbnails/ice-cream.png'),
  juice: require('../../assets/thumbnails/juice.png'),
  leafy: require('../../assets/thumbnails/leafy.png'),
  milk: require('../../assets/thumbnails/milk.png'),
  oil: require('../../assets/thumbnails/oil.png'),
  orange: require('../../assets/thumbnails/orange.png'),
  paper: require('../../assets/thumbnails/paper.png'),
  pasta: require('../../assets/thumbnails/pasta.png'),
  peanuts: require('../../assets/thumbnails/peanuts.png'),
  pet: require('../../assets/thumbnails/pet.png'),
  pizza: require('../../assets/thumbnails/pizza.png'),
  popcorn: require('../../assets/thumbnails/popcorn.png'),
  rice: require('../../assets/thumbnails/rice.png'),
  salt: require('../../assets/thumbnails/salt.png'),
  sandwich: require('../../assets/thumbnails/sandwich.png'),
  shrimp: require('../../assets/thumbnails/shrimp.png'),
  soap: require('../../assets/thumbnails/soap.png'),
  sponge: require('../../assets/thumbnails/sponge.png'),
  strawberry: require('../../assets/thumbnails/strawberry.png'),
  tomato: require('../../assets/thumbnails/tomato.png'),
  water: require('../../assets/thumbnails/water.png'),
} satisfies Record<ThumbnailKey, ImageSource>;

export function thumbnailSource(name: string, departmentName?: string | null): ImageSource {
  return images[thumbnailKeyForProduct(name, departmentName)];
}
