export type TripHotelOption = {
  name: string;
  rating: string;
  reviews: string;
  proximity: string;
  address: string;
  tripUrl: string;
};

/**
 * Curated hotel facts taken from Trip.com hotel/venue pages.
 * Ratings and review counts are intentionally rounded because they change over time.
 * Current room prices are not cached: the UI sends the user to Trip.com for the
 * selected travel dates instead of showing a stale hard-coded tariff.
 */
export const tripHotelsByEvent: Record<string, TripHotelOption[]> = {
  "citexpo-2026": [
    {
      name: "MUMIAN SHANGHAI EXPO, The Unbound Collection by Hyatt",
      rating: "9.6/10",
      reviews: "3 100+ отзывов",
      proximity: "0,23 км до Shanghai World Expo Exhibition and Convention Center",
      address: "No. 861 Bocheng Road, Pudong New Area, Shanghai, China",
      tripUrl: "https://www.trip.com/hotels/v2/shanghai-hotel-detail-128045084/mumian-shanghai-expo-the-unbound-collection-by-hyatt/",
    },
    {
      name: "Shanghai Expo Riverside Hotel",
      rating: "9.7/10",
      reviews: "1 200+ отзывов",
      proximity: "0,52 км до Shanghai World Expo Exhibition and Convention Center",
      address: "No. 1588 Shibo Avenue, Pudong New Area, Shanghai, China",
      tripUrl: "https://www.trip.com/hotels/shanghai-hotel-detail-119368896/shanghai-expo-riverside-hotel/",
    },
  ],
  "china-nev-icv-2026": [
    {
      name: "Grand Skylight International Hotel Beijing",
      rating: "9.3/10",
      reviews: "3 600+ отзывов",
      proximity: "0,74 км до Beijing Yichuang International Convention and Exhibition Center",
      address: "Building 10, CATIC Plaza, No. 15 Ronghua South Road, Yizhuang Economic and Technological Development Zone, Daxing District, Beijing, China",
      tripUrl: "https://www.trip.com/hotels/beijing-hotel-detail-6182624/grand-skylight-international-hotel-beijing/",
    },
    {
      name: "Pullman Beijing South",
      rating: "9.4/10",
      reviews: "600+ отзывов",
      proximity: "1,19 км до Beijing Yichuang International Convention and Exhibition Center",
      address: "No. 12 Ronghua South Road, Economic and Technological Development Zone, Daxing District, Beijing, China",
      tripUrl: "https://www.trip.com/hotels/beijing-hotel-detail-430008/pullman-beijing-south/",
    },
  ],
  "bauma-china-2026": [
    {
      name: "Kerry Hotel Pudong Shanghai",
      rating: "9.4/10",
      reviews: "6 400+ отзывов",
      proximity: "0,54 км до Shanghai New International Expo Centre",
      address: "No. 1388 Huamu Road, Pudong New Area, Shanghai, China",
      tripUrl: "https://www.trip.com/hotels/shanghai-hotel-detail-429573/kerry-hotel-pudong-shanghai/",
    },
    {
      name: "IntercityHotel Shanghai New International Expo Center",
      rating: "9.8/10",
      reviews: "3 600+ отзывов",
      proximity: "около 0,8 км до Shanghai New International Expo Centre",
      address: "1st Floor, Tower A, Yingfeng Tiandi, No. 2233 Longyang Road, Pudong New Area, Shanghai, China",
      tripUrl: "https://www.trip.com/hotels/shanghai-hotel-detail-95749195/intercityhotel-shanghai-new-international-expo-center/",
    },
  ],
  "auto-tech-guangzhou-2026": [
    {
      name: "The Westin Pazhou",
      rating: "9.5/10",
      reviews: "2 400+ отзывов",
      proximity: "Area C, Canton Fair Complex; 0,16 км до Pazhou Exhibition Center",
      address: "Area C, Canton Fair Complex, No. 681 Fengpu Middle Road, Haizhu District, Guangzhou, China",
      tripUrl: "https://www.trip.com/hotels/guangzhou-hotel-detail-419315/the-westin-pazhou/",
    },
    {
      name: "Langham Place Guangzhou",
      rating: "9.5/10",
      reviews: "3 100+ отзывов",
      proximity: "0,27 км до Pazhou Exhibition Center",
      address: "No. 638 Xingang East Road, Haizhu District, Guangzhou, China",
      tripUrl: "https://www.trip.com/hotels/guangzhou-hotel-detail-512125/langham-place-guangzhou/",
    },
  ],
  "auto-guangzhou-2026": [
    {
      name: "The Westin Pazhou",
      rating: "9.5/10",
      reviews: "2 400+ отзывов",
      proximity: "Area C, Canton Fair Complex; 0,16 км до Pazhou Exhibition Center",
      address: "Area C, Canton Fair Complex, No. 681 Fengpu Middle Road, Haizhu District, Guangzhou, China",
      tripUrl: "https://www.trip.com/hotels/guangzhou-hotel-detail-419315/the-westin-pazhou/",
    },
    {
      name: "Langham Place Guangzhou",
      rating: "9.5/10",
      reviews: "3 100+ отзывов",
      proximity: "0,27 км до Pazhou Exhibition Center",
      address: "No. 638 Xingang East Road, Haizhu District, Guangzhou, China",
      tripUrl: "https://www.trip.com/hotels/guangzhou-hotel-detail-512125/langham-place-guangzhou/",
    },
  ],
  "automechanika-shanghai-2026": [
    {
      name: "InterContinental Hotels SHANGHAI HONGQIAO NECC by IHG",
      rating: "9.5/10",
      reviews: "7 100+ отзывов",
      proximity: "0,35 км до National Exhibition and Convention Center (NECC) Shanghai",
      address: "No. 1700 Zhuguang Road, Qingpu District, Shanghai, China",
      tripUrl: "https://www.trip.com/hotels/shanghai-hotel-detail-5310859/intercontinental-hotels-shanghai-hongqiao-necc-by-ihg/",
    },
    {
      name: "Primus Hotel Shanghai Hongqiao",
      rating: "9.3/10",
      reviews: "3 200+ отзывов",
      proximity: "0,78 км до National Exhibition and Convention Center (NECC) Shanghai",
      address: "No. 100, Lane 1588, Zhuguang Road, Xujing Town, Qingpu District, Shanghai, China",
      tripUrl: "https://www.trip.com/hotels/shanghai-hotel-detail-11443556/primus-hotel-shanghai-hongqiao/",
    },
  ],
  "capas-chengdu-2027": [
    {
      name: "Holiday Inn CHENGDU CENTURY CITY-EASTTOWER by IHG",
      rating: "9.4/10",
      reviews: "1 200+ отзывов",
      proximity: "0,28 км до Century City International Exhibition Center — Hall 2",
      address: "No. 198 Shijicheng Road, High-tech Zone, Wuhou District, Chengdu, Sichuan, China",
      tripUrl: "https://www.trip.com/hotels/chengdu-hotel-detail-429874/holiday-inn-chengdu-century-city-easttower-by-ihg/",
    },
    {
      name: "InterContinental Hotels CENTURY CITY CHENGDU by IHG",
      rating: "9.4/10",
      reviews: "4 100+ отзывов",
      proximity: "0,60 км до Century City International Exhibition Center",
      address: "No. 88 Shijicheng Road, High-tech Zone, Wuhou District, Chengdu, Sichuan, China",
      tripUrl: "https://www.trip.com/hotels/chengdu-hotel-detail-416180/intercontinental-hotels-century-city-chengdu-by-ihg/",
    },
  ],
};

export function getTripHotels(eventId: string) {
  return tripHotelsByEvent[eventId] ?? [];
}
