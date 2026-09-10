export type PilotHotel = {
  name: string;
  chineseName: string;
  proximity: string;
  nightlyPrice: string;
  bookingUrl: string;
};

const shanghaiExpo: PilotHotel[] = [
  {
    name: "InterContinental Shanghai Expo",
    chineseName: "上海世博洲际酒店",
    proximity: "в зоне Shanghai Expo; до SWEECC можно дойти пешком",
    nightlyPrice: "9 000–17 000 ₽ / ночь",
    bookingUrl: "https://www.ihg.com/intercontinental/hotels/us/en/shanghai/shghb/hoteldetail",
  },
  {
    name: "Holiday Inn Express Shanghai Expo Centre",
    chineseName: "上海世博中心智选假日酒店",
    proximity: "рядом с Shanghai World Expo Exhibition & Convention Center",
    nightlyPrice: "5 000–9 000 ₽ / ночь",
    bookingUrl: "https://www.ihg.com/holidayinnexpress/hotels/us/en/shanghai/shapd/hoteldetail",
  },
];

const beijingEtrong: PilotHotel[] = [
  {
    name: "Pullman Beijing South",
    chineseName: "北京兴基雅高铂尔曼饭店",
    proximity: "≈0,7 км до Beijing Etrong — около 10–12 минут пешком",
    nightlyPrice: "6 000–12 000 ₽ / ночь",
    bookingUrl: "https://all.accor.com/hotel/7025/index.en.shtml",
  },
  {
    name: "Grand Skylight International Hotel Beijing",
    chineseName: "北京格兰云天国际酒店",
    proximity: "≈1,3 км до Beijing Etrong — около 12–15 минут пешком",
    nightlyPrice: "7 000–13 000 ₽ / ночь",
    bookingUrl: "https://beijing.grandskylighthotel.cn/en",
  },
];

const shanghaiPudong: PilotHotel[] = [
  {
    name: "Kerry Hotel Pudong Shanghai",
    chineseName: "上海浦东嘉里大酒店",
    proximity: "напрямую соединён с Shanghai New International Expo Centre (SNIEC)",
    nightlyPrice: "12 000–22 000 ₽ / ночь",
    bookingUrl: "https://www.kerryshanghai.cn/en",
  },
  {
    name: "Dorsett Shanghai",
    chineseName: "上海帝盛酒店",
    proximity: "≈1,5 км до SNIEC — около 20 минут пешком или 5 минут на автомобиле",
    nightlyPrice: "6 500–11 000 ₽ / ночь",
    bookingUrl: "https://www.dorsetthotels.com/dorsett-shanghai/",
  },
];

const guangzhouPazhou: PilotHotel[] = [
  {
    name: "The Westin Pazhou",
    chineseName: "广州广交会威斯汀酒店",
    proximity: "на территории Area C Canton Fair Complex; прямой доступ к комплексу",
    nightlyPrice: "9 000–16 000 ₽ / ночь",
    bookingUrl: "https://www.marriott.com/en-us/hotels/canwi-the-westin-pazhou/overview/",
  },
  {
    name: "Langham Place Guangzhou",
    chineseName: "广州南丰朗豪酒店",
    proximity: "через дорогу от Canton Fair Complex — около 10 минут пешком",
    nightlyPrice: "10 000–18 000 ₽ / ночь",
    bookingUrl: "https://www.langhamhotels.com/en/the-langham/guangzhou/",
  },
];

const shanghaiHongqiao: PilotHotel[] = [
  {
    name: "InterContinental Shanghai Hongqiao NECC",
    chineseName: "上海国家会展中心洲际酒店",
    proximity: "расположен внутри National Exhibition and Convention Center (NECC)",
    nightlyPrice: "10 000–18 000 ₽ / ночь",
    bookingUrl: "https://www.ihg.com/intercontinental/hotels/us/en/shanghai/shgic/hoteldetail",
  },
  {
    name: "Primus Hotel Shanghai Hongqiao",
    chineseName: "上海虹桥绿地铂瑞酒店",
    proximity: "до NECC менее 500 м пешком",
    nightlyPrice: "7 000–13 000 ₽ / ночь",
    bookingUrl: "https://www.primusshanghai.cn/en",
  },
];

const chengduCenturyCity: PilotHotel[] = [
  {
    name: "InterContinental Century City Chengdu",
    chineseName: "成都世纪城天堂洲际大饭店",
    proximity: "непосредственно рядом с Century City Convention & Exhibition Center",
    nightlyPrice: "7 000–13 000 ₽ / ночь",
    bookingUrl: "https://www.ihg.com/intercontinental/hotels/us/en/chengdu/ctuha/hoteldetail",
  },
  {
    name: "Holiday Inn Chengdu Century City — East Tower",
    chineseName: "成都世纪城假日酒店东楼",
    proximity: "в комплексе Century City, рядом с выставочным центром",
    nightlyPrice: "4 500–8 000 ₽ / ночь",
    bookingUrl: "https://www.ihg.com/holidayinn/hotels/us/en/chengdu/ctucc/hoteldetail",
  },
];

export const pilotEventHotels: Record<string, PilotHotel[]> = {
  "citexpo-2026": shanghaiExpo,
  "china-nev-icv-2026": beijingEtrong,
  "bauma-china-2026": shanghaiPudong,
  "auto-tech-guangzhou-2026": guangzhouPazhou,
  "auto-guangzhou-2026": guangzhouPazhou,
  "automechanika-shanghai-2026": shanghaiHongqiao,
  "capas-chengdu-2027": chengduCenturyCity,
};

export const pilotVenueOverrides: Record<string, string> = {
  "china-nev-icv-2026": "Beijing Etrong International Exhibition & Convention Center (北人亦创国际会展中心)",
};
